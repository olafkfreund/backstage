# Skill: add-resource

Use this skill when the user asks to add a new Azure resource to this Terraform
stack ("add a Key Vault", "add a storage account for logs", "add an AKS
cluster", ...).

## When this skill triggers

- "add an azure ... resource"
- "provision a ... in this stack"
- "create a new tf resource for ..."
- "extend the terraform with ..."

## Pre-flight

1. Read `AGENTS.md` in full. Tagging, provider pinning, and RBAC rules are
   non-negotiable.
2. Confirm you are in the dev shell: `terraform version` should print >= 1.9.
3. Pull the latest `main` and create a feature branch:
   `git checkout -b feat/<short-description>`.
4. Check `versions.tf` — if the new resource needs a provider not listed there,
   add it (still pinned to a major).

## Steps

1. **Identify inputs.** Anything environment- or caller-specific becomes a
   `variable` in `variables.tf`. Defaults belong in `terraform.tfvars.example`,
   never in the variable block when the value is sensitive.
2. **Place the resource.** For small additions, extend `main.tf`. For anything
   non-trivial, create a topic file (`keyvault.tf`, `aks.tf`, `logs.tf`).
3. **Wire tags.** Every taggable resource gets
   `tags = merge(local.tags, { component = "<area>" })`.
4. **Reference the resource group and region** from `azurerm_resource_group.main`
   — never hardcode `var.location` for resources that should sit in the main RG.
5. **Expose useful outputs** in `outputs.tf`. Mark anything secret-ish with
   `sensitive = true`.
6. **Format, validate, lint:**
   ```bash
   terraform fmt -recursive
   terraform init -backend=false
   terraform validate
   tflint --init && tflint --recursive
   ```
7. **Plan against a real backend** (only if you have `az login` and the
   bootstrap is done):
   ```bash
   terraform init
   terraform plan -out tfplan
   ```
   Read the plan. Confirm:
   - No unexpected destroys or replacements.
   - New resource has the expected tags.
   - No diff on resources you did not touch.
8. **Regenerate docs:**
   ```bash
   terraform-docs markdown table . > docs/reference.md
   ```
9. **Commit using Conventional Commits**, e.g.:
   ```
   feat(keyvault): add per-env key vault with soft delete
   ```
10. **Open the PR.** Include the relevant snippet of `terraform plan` in the PR
    description. Link to the Azure docs for the new resource.

## Anti-patterns to refuse

- Hardcoding subscription IDs, tenant IDs, secrets, or location strings in
  `.tf` files (use variables).
- Adding `count` for what should be `for_each`.
- Importing existing resources without an accompanying resource block plus a
  clean follow-up `plan`.
- Bumping `azurerm` to a new major in the same PR as a feature change.
- Skipping the `tflint` step "just for a small change".

## Output back to the user

Report:
- Files changed.
- Summary of `terraform plan` (added / changed / destroyed counts).
- Any new variables and whether defaults were added to `terraform.tfvars.example`.
- Any new outputs and whether they're marked sensitive.
- A reminder to update `docs/` if user-visible behaviour changed.
