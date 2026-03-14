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

variable "pages_project_name" {
  description = "Cloudflare Pages project name (created via dashboard with GitHub integration)"
  type        = string
  default     = "alkem-dev"
}

# DNS zone lookup
data "cloudflare_zones" "main" {
  name = var.zone_name
}

locals {
  zone_id = data.cloudflare_zones.main.result[0].id
}

# Custom domain binding
resource "cloudflare_pages_domain" "apex" {
  account_id   = var.account_id
  project_name = var.pages_project_name
  name         = var.zone_name
}

# DNS CNAME record
resource "cloudflare_dns_record" "apex" {
  zone_id = local.zone_id
  name    = "@"
  type    = "CNAME"
  content = "${var.pages_project_name}.pages.dev"
  proxied = true
  ttl     = 1
}
