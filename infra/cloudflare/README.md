# Cloudflare Infrastructure

End-to-end infrastructure-as-code for `alkem.dev` using
[OpenTofu](https://opentofu.org) with the
[Cloudflare provider v5](https://registry.terraform.io/providers/cloudflare/cloudflare/latest).

No GitHub Actions, no dashboard clicks (after the one-time OAuth) — just
`tofu apply`.

## What Terraform manages

| Resource                        | Purpose                                                                                          |
| ------------------------------- | ------------------------------------------------------------------------------------------------ |
| `cloudflare_pages_project.this` | The Pages project itself: GitHub source binding, build command, output dir, NODE_VERSION env var |
| `cloudflare_pages_domain.apex`  | Binds `alkem.dev` to the Pages project                                                           |
| `cloudflare_dns_record.apex`    | CNAME `alkem.dev` → `<project>.pages.dev` (proxied)                                              |
| `data.cloudflare_zones.main`    | Looks up the zone ID by name                                                                     |

## One-time prerequisite (not Terraform-able)

Cloudflare's GitHub App must be authorized against the account once.
This is an OAuth handshake — no public API exists. Visit
**Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git**
and authorize the `alkemdev` GitHub org. After that, every subsequent
Pages project that points at a repo in that org can be created via
Terraform.

If the authorization is already done (existing project deploys via Git
push), skip this step.

## Prerequisites

- [OpenTofu](https://opentofu.org/docs/intro/install/) ≥ 1.6 (or Terraform)
- A Cloudflare API token with these permissions:
  - **Account → Cloudflare Pages → Edit**
  - **Zone → DNS → Edit** (scoped to the target zone)
- The `alkem.dev` zone already exists in the Cloudflare account
- Cloudflare's GitHub App authorized for the source org (see above)

## Setup

```bash
cp terraform.tfvars.example terraform.tfvars
# Fill in account_id

export CLOUDFLARE_API_TOKEN="..."

tofu init
```

### Adopting the existing project

If the Pages project was created via the dashboard before this Terraform
config existed, import it before applying — otherwise `apply` will try to
create a duplicate.

```bash
tofu import cloudflare_pages_project.this <account_id>/<project_name>
tofu import cloudflare_pages_domain.apex  <account_id>/<project_name>/<domain>
tofu plan    # confirm the config matches reality (zero changes is the goal)
```

> **Heads-up:** projects with `secret_text` env vars cannot be imported.
> Convert them to `plain_text` (or remove them) in the Cloudflare dashboard
> first, then import.

### Fresh setup

```bash
tofu apply   # creates the Pages project, custom domain, DNS record
```

The first deploy still has to happen the usual way (`git push` to `main`).
The Pages project is provisioned by Terraform but Cloudflare's build
runner triggers off the GitHub webhook — it's not driven by `tofu apply`.

## Files

| File                       | Tracked         | Purpose                                                |
| -------------------------- | --------------- | ------------------------------------------------------ |
| `main.tf`                  | Yes             | Resource definitions                                   |
| `terraform.tfvars.example` | Yes             | Template for variables                                 |
| `terraform.tfvars`         | No (gitignored) | Actual variable values (only `account_id` is required) |
| `.terraform.lock.hcl`      | Yes             | Provider version lock                                  |
| `.terraform/`              | No (gitignored) | Provider binaries                                      |
| `*.tfstate`                | No (gitignored) | State files (consider remote state for team use)       |

## Outputs

After apply:

```bash
tofu output
# pages_project_subdomain = "alkem-dev.pages.dev"
# site_url                = "https://alkem.dev"
```

## Why no GitHub Actions

Cloudflare Pages already has a built-in CI runner that listens to the
GitHub webhook on its source binding — adding GitHub Actions on top is
duplicate work and a second permissions surface. Pushes to `main`
auto-deploy via Cloudflare's runner; PRs get preview deploys for free.
