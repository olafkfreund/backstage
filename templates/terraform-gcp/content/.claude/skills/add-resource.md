---
name: add-resource
description: Add a new Terraform resource to this GCP project following the project's conventions (file layout, variables, outputs, labels, IAM, regional defaults).
---

# Skill: add-resource

Use this skill when the user asks to add a new GCP resource to this Terraform
project (e.g. "add a Cloud Storage bucket", "provision a Cloud SQL instance",
"create a service account for ...").

## Checklist

1. **Identify the right file.**
   - Generic / catch-all → `main.tf`.
   - Cohesive group → new file at the repo root: `iam.tf`, `network.tf`,
     `storage.tf`, `dns.tf`, etc.
   - Never put resources inside `backend-bootstrap/` — that module's only
     job is the state bucket.

2. **Pick GA over beta.**
   - Use the `google` provider unless the resource/argument you need is
     beta-only.
   - If you must use `google-beta`, set `provider = google-beta` explicitly
     on that resource.

3. **Default to regional.**
   - Regional resources are cheaper and have simpler failure semantics.
   - Only choose multi-regional when there's a stated availability or
     data-locality requirement. Add a code comment explaining why.

4. **Inputs → `variables.tf`.**
   - Every tunable knob gets a `variable` block with `type`, `description`,
     and ideally `validation`.
   - Prefer sensible defaults so `terraform plan` works without
     `terraform.tfvars`.

5. **Outputs → `outputs.tf`.**
   - Expose IDs, self-links, and any value another module or operator might
     need (`output "foo_id"`, with `description`).

6. **Labels.**
   - Merge `local.default_labels` with resource-specific labels:
     `labels = merge(local.default_labels, { tier = "data" })`.

7. **IAM.**
   - Use `google_<resource>_iam_member` (additive) — never
     `google_<resource>_iam_policy` (authoritative).
   - Grant the smallest predefined role at the smallest scope.
   - Never grant `roles/owner` or `roles/editor` from Terraform.

8. **Validate locally.**
   ```sh
   terraform fmt -recursive
   terraform init -backend=false
   terraform validate
   tflint --recursive
   ```

9. **Document.**
   - Add user-visible behaviour to `docs/index.md`.
   - Add operational notes to `docs/development.md` if relevant.

10. **Commit.**
    - Conventional commit prefix: `feat(<area>): ...` for new resources,
      `fix(<area>): ...` for bug fixes.
    - Include the `terraform plan` summary in the PR description (resource
      counts: "+5 to add, ~1 to change, 0 to destroy").

## Anti-patterns to avoid

- Hard-coding the GCP project ID inside resources — use `var.project_id`.
- Hard-coding regions/zones — use `var.region` or a new `var.zone`.
- Adding `count = var.enabled ? 1 : 0` toggles — prefer separate modules or
  `for_each = var.enabled ? toset(["main"]) : toset([])` if you must.
- Embedding secrets in `*.tfvars` or in resource arguments. Use Secret
  Manager + `google_secret_manager_secret_version`.
- Disabling `versioning` on the state bucket.
- Using `local-exec` provisioners as a workaround — open an issue instead.

## Example: add a Cloud Storage bucket

```hcl
# storage.tf
resource "google_storage_bucket" "artifacts" {
  name     = "${var.project_id}-artifacts"
  location = var.region
  project  = var.project_id

  storage_class               = "STANDARD"
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  versioning {
    enabled = true
  }

  labels = merge(local.default_labels, {
    purpose = "artifacts"
  })
}

output "artifacts_bucket" {
  description = "Name of the artifacts bucket."
  value       = google_storage_bucket.artifacts.name
}
```
