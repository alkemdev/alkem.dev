# Cloudflare Infrastructure

Manages DNS and custom domain binding for `alkem.dev` using
[OpenTofu](https://opentofu.org) with the
[Cloudflare provider v5](https://registry.terraform.io/providers/cloudflare/cloudflare/latest).

## What Terraform manages

| Resource | Purpose |
|----------|---------|
| `cloudflare_dns_record.apex` | CNAME `alkem.dev` → `alkem-dev.pages.dev` |
| `cloudflare_pages_domain.apex` | Binds `alkem.dev` to the Pages project |

## What Terraform does NOT manage

The **Cloudflare Pages project** itself is created via the Cloudflare
dashboard. This is required because GitHub integration (auto-deploy on push)
uses an OAuth flow that cannot be done through the API.

## Prerequisites

- [OpenTofu](https://opentofu.org/docs/intro/install/) >= 1.6 (or Terraform)
- A Cloudflare API token with these permissions:
  - **Zone > DNS > Edit** (scoped to the target account)
  - **Account > Cloudflare Pages > Edit**
- The `alkem.dev` zone must already exist in the Cloudflare account
- The `alkem-dev` Pages project must already exist (created via dashboard)

## Setup

1. Copy the example tfvars:

   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```

2. Fill in your Cloudflare account ID in `terraform.tfvars`.

3. Export your API token:

   ```bash
   export CLOUDFLARE_API_TOKEN="your-token-here"
   ```

4. Initialize and apply:

   ```bash
   tofu init
   tofu plan    # review changes
   tofu apply   # apply changes
   ```

## Files

| File | Tracked | Purpose |
|------|---------|---------|
| `main.tf` | Yes | Resource definitions |
| `terraform.tfvars.example` | Yes | Template for variables |
| `terraform.tfvars` | No (gitignored) | Actual variable values |
| `.terraform.lock.hcl` | Yes | Provider version lock |
| `.terraform/` | No (gitignored) | Provider binaries |
| `*.tfstate` | No (gitignored) | State files |
