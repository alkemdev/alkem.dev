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

variable "account_id" {
  description = "Cloudflare account ID"
  type        = string
}

variable "zone_name" {
  description = "DNS zone name"
  type        = string
  default     = "alkem.dev"
}

variable "github_owner" {
  description = "GitHub organization or user"
  type        = string
  default     = "alkemdev"
}

# Pages project
resource "cloudflare_pages_project" "site" {
  account_id = var.account_id
  name       = "alkem-dev"

  production_branch = "main"

  build_config = {
    build_command   = "npm run build"
    destination_dir = "dist"
  }
}

# Custom domain binding
resource "cloudflare_pages_domain" "apex" {
  account_id   = var.account_id
  project_name = cloudflare_pages_project.site.name
  name         = var.zone_name
}

# DNS — look up zone
data "cloudflare_zones" "main" {
  name = var.zone_name
}

locals {
  zone_id = data.cloudflare_zones.main.result[0].id
}

resource "cloudflare_dns_record" "apex" {
  zone_id = local.zone_id
  name    = "@"
  type    = "CNAME"
  content = "${cloudflare_pages_project.site.name}.pages.dev"
  proxied = true
  ttl     = 1
}
