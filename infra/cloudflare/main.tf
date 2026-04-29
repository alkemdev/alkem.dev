terraform {
  required_version = ">= 1.6"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }
}

provider "cloudflare" {}

# ---------- Variables ----------

variable "account_id" {
  description = "Cloudflare account ID"
  type        = string
}

variable "zone_name" {
  description = "DNS zone name"
  type        = string
  default     = "alkem.dev"
}

variable "pages_project_name" {
  description = "Cloudflare Pages project slug (no dots — CF converts repo dots to dashes)"
  type        = string
  default     = "alkem-dev"
}

variable "github_owner" {
  description = "GitHub org/user that owns the source repo"
  type        = string
  default     = "alkemdev"
}

variable "github_repo" {
  description = "GitHub repo name (case-sensitive)"
  type        = string
  default     = "alkem.dev"
}

variable "production_branch" {
  description = "Branch that triggers production deploys"
  type        = string
  default     = "main"
}

variable "node_version" {
  description = "NODE_VERSION env var for the Pages build container (Astro 6 needs 22+)"
  type        = string
  default     = "22"
}

# ---------- Data sources ----------

data "cloudflare_zones" "main" {
  name = var.zone_name
}

locals {
  zone_id = data.cloudflare_zones.main.result[0].id
}

# ---------- Cloudflare Pages project ----------

# The project itself, including GitHub source binding and build config.
# Cloudflare's GitHub App must be authorized against this account once
# (one-time OAuth, not a Terraform-able operation); after that, Terraform
# can fully manage the project. Adopt the existing project with:
#   tofu import cloudflare_pages_project.this <account_id>/<project_name>
resource "cloudflare_pages_project" "this" {
  account_id        = var.account_id
  name              = var.pages_project_name
  production_branch = var.production_branch

  build_config = {
    build_caching   = true
    build_command   = "npm run build"
    destination_dir = "dist"
    root_dir        = "/"
  }

  source = {
    type = "github"
    config = {
      owner                          = var.github_owner
      repo_name                      = var.github_repo
      production_branch              = var.production_branch
      production_deployments_enabled = true
      preview_deployment_setting     = "all"
      pr_comments_enabled            = true
      # Match Cloudflare's defaults explicitly so plans stay deterministic
      # rather than showing "known after apply" drift on every refresh.
      path_includes           = ["*"]
      path_excludes           = []
      preview_branch_includes = ["*"]
      preview_branch_excludes = []
    }
  }

  deployment_configs = {
    production = {
      env_vars = {
        NODE_VERSION = {
          type  = "plain_text"
          value = var.node_version
        }
      }
    }
    preview = {
      env_vars = {
        NODE_VERSION = {
          type  = "plain_text"
          value = var.node_version
        }
      }
    }
  }
}

# ---------- Custom domain binding ----------

resource "cloudflare_pages_domain" "apex" {
  account_id   = var.account_id
  project_name = cloudflare_pages_project.this.name
  name         = var.zone_name
}

# ---------- DNS ----------

resource "cloudflare_dns_record" "apex" {
  zone_id = local.zone_id
  name    = "@"
  type    = "CNAME"
  content = "${cloudflare_pages_project.this.name}.pages.dev"
  proxied = true
  ttl     = 1
}

# ---------- Outputs ----------

output "pages_project_subdomain" {
  description = "Cloudflare-assigned <project>.pages.dev subdomain"
  value       = "${cloudflare_pages_project.this.name}.pages.dev"
}

output "site_url" {
  description = "Public site URL"
  value       = "https://${var.zone_name}"
}
