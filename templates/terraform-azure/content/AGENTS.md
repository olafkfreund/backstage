# AGENTS.md

Conventions for AI assistants (Claude Code, Copilot, Cursor, Cody, ...) and
humans working in this repository. If you are an AI agent: **read this file
before editing anything**.

## Stack snapshot

- **Tool:** Terraform >= 1.9
- **Provider:** `hashicorp/azurerm` pinned to `~> 4.0`
- **Backend:** AzureRM blob storage (`${{ values.stateStorageAccount }}` / `tfstate`)
- **Region:** `${{ values.azureLocation }}`
- **Subscription:** `${{ values.azureSubscriptionId }}`
- **Dev shell:** Nix flake using devenv
- **CI:** GitHub Actions — `fmt`, `validate`, `tflint`

## Do this

- **Format before you commit.** Run `terraform fmt -recursive`. CI will fail on
  unformatted files.
- **Validate before you commit.** `terraform validate` must pass.
- **Lint before you commit.** `tflint --recursive` must pass.
- **Keep state remote.** All real state belongs in the AzureRM backend. Never
  switch to the `local` backend, even temporarily.
- **Pin the provider major.** Stay on `~> 4.0` until a deliberate, reviewed
  upgrade. Major bumps go in their own PR with a migration note.
- **Tag every resource.** At minimum: `environment`, `owner`, and
  `managed_by = "terraform"`. Use the `var.tags` map.
- **Use `for_each` over `count`** when iterating, so additions and removals do
  not shuffle resource addresses.
- **Reference variables, not literals.** Region, subscription, names, CIDRs all
  come from `variables.tf`.
- **Run `terraform plan` and read it.** Pay attention to destroys and replaces.
- **Use modules for repeated patterns.** A module lives under `modules/<name>/`
  with its own `main.tf`, `variables.tf`, `outputs.tf`, `versions.tf`,
  `README.md`.
- **Prefer managed identities** over storing secrets in tfvars or Key Vault
  references where possible.
- **For CI/CD: use Azure OIDC federated identity.** Steps to enable:
  1. Create an App Registration in Microsoft Entra ID.
  2. Add a federated credential for the GitHub repo and the relevant ref
     (e.g. `repo:${{ values.destination.owner }}/${{ values.destination.repo }}:ref:refs/heads/main`).
  3. Grant the SP `Contributor` on the target subscription/resource group
     (least privilege — scope down where possible).
  4. Wire the GitHub Actions workflow with `permissions: id-token: write` and
     `azure/login@v2` using `client-id`, `tenant-id`, `subscription-id`.
  5. Drop any client secrets from CI.

## Don't do this

- **Don't commit `terraform.tfvars`.** Only `terraform.tfvars.example` is
  tracked. Real values stay out of git.
- **Don't commit `.terraform/`, `*.tfstate`, `*.tfstate.backup`,
  `crash.log`, `tfplan`.** All gitignored — keep them that way.
- **Don't run `terraform apply` from a laptop against production.** Production
  changes go through CI/CD with OIDC.
- **Don't disable backend state locking.** It prevents concurrent apply races.
- **Don't allow public blob access** on the tfstate storage account. The
  bootstrap stack sets `allow_blob_public_access = false`; keep it that way.
- **Don't `terraform import` without an accompanying resource block and a
  follow-up `plan` showing zero drift.
- **Don't bypass tagging.** Untagged resources fail policy in real Azure
  subscriptions and break cost allocation.
- **Don't widen network CIDRs without review.** RFC1918 ranges only, no
  `0.0.0.0/0` inbound on NSGs.
- **Don't pin Terraform or providers to exact patch versions** (`= 1.9.3`).
  Use ranges (`>= 1.9.0`, `~> 4.0`) so security fixes flow in.
- **Don't put secrets in outputs.** Use `sensitive = true` if a secret-ish value
  must be exposed; better, keep it in Key Vault and reference by name.

## RBAC and management groups

- Service principals used by Terraform should be scoped to the **smallest
  resource group / subscription** that can perform the change.
- Management group assignments (`azurerm_management_group_policy_assignment`,
  role assignments at MG scope) belong in a dedicated `governance` stack, not
  this app/infra stack.
- When this stack needs a new RBAC assignment, define it as an explicit
  `azurerm_role_assignment` resource — never bake it into a script.

## Tagging policy

Every taggable resource must receive the `var.tags` map merged with any
resource-specific tags:

```hcl
tags = merge(var.tags, {
  component = "network"
})
```

`var.tags` defaults include `managed_by = "terraform"`,
`stack = "${{ values.name }}"`, and `environment` (set per workspace).

## Provider upgrade discipline

- `azurerm` upgrades land in **their own PR**, with a link to the
  [`azurerm` upgrade guide](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/guides),
  a fresh `terraform plan`, and notes on any breaking changes.
- After upgrade: regenerate `docs/reference.md` with `terraform-docs`.

## Quick checklist before opening a PR

- [ ] `terraform fmt -recursive` clean
- [ ] `terraform validate` clean
- [ ] `tflint --recursive` clean
- [ ] `terraform plan` reviewed, no surprise destroys
- [ ] All new resources tagged via `var.tags`
- [ ] No secrets in code or plan output
- [ ] Provider versions still pinned to `~> 4.0`
- [ ] Updated `docs/` if behaviour or inputs changed
