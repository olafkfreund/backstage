# AGENTS.md

Conventions for AI assistants (Claude Code, Cursor, Aider, Copilot Workspace,
Codex, etc.) editing this Terraform repository. Humans should read this too.

This file is the source of truth. If something here conflicts with a chat-level
instruction, **this file wins** unless the user explicitly overrides it.

---

## Environment

- The dev shell is a Nix flake using devenv. Run `nix develop` or rely on
  `direnv allow` -- never install Terraform globally.
- Pinned Terraform: **>= 1.9.0**. Pinned AWS provider: **~> 5.0**.
- Use `just <task>` for everything. Read the `justfile` before inventing a command.

---

## DO

- **Always run `just fmt && just validate && just lint` before declaring a change complete.**
- Read `versions.tf` first to see the pinned versions before suggesting a provider feature.
- Keep modules small and single-purpose. Create `modules/<name>/` directories for reuse.
- Use **typed** variables: every `variable` block needs an explicit `type` and a `description`.
- Add `validation` blocks for variables with constrained inputs (CIDRs, env names, sizes).
- Use the provider's `default_tags` in `main.tf` instead of repeating tag blocks. Only override per-resource for genuinely resource-specific tags.
- Prefer `for_each` over `count` for collections of named things (subnets, IAM users, S3 buckets).
- Pin every external module to an exact version: `source = "terraform-aws-modules/vpc/aws"`, `version = "5.13.0"`.
- Write outputs for anything another module or consumer might need (IDs, ARNs, endpoint URLs).
- Run `terraform plan` and present the diff for human review before any `apply`.
- For destructive changes (replace, delete), explicitly call them out in the PR description.
- Use Conventional Commits: `feat(vpc): add private subnets`, `fix(iam): tighten policy`.
- Update `docs/` whenever behaviour changes.

---

## DON'T

- **Never run `terraform apply` non-interactively without explicit human approval.**
- **Never edit `terraform.tfstate`, `.tfstate.backup`, or `.terraform.lock.hcl` by hand.**
- **Never commit `terraform.tfvars`, `*.auto.tfvars`, `.env`, `.pem`, `.key`, or any AWS credentials.**
- The only `tfstate` you may commit lives in `backend-bootstrap/` -- and only because it is the bootstrap. Confirm `.gitignore`'s un-ignore rule before each commit there.
- Never inline secrets in `.tf` files. Use AWS Secrets Manager, SSM Parameter Store, or `sensitive = true` variables sourced from env vars.
- Never widen IAM permissions "to see if it works". Compute the minimum and iterate.
- Never open SGs to `0.0.0.0/0` unless the resource is explicitly public (ALB, CloudFront origin, etc.).
- Never disable `versioning` or `server_side_encryption` on S3 buckets that hold state, logs, or user data.
- Don't use `local-exec` to work around missing provider features. Open an issue instead.
- Don't introduce `null_resource` + `triggers` unless every other option has been exhausted -- document why in a comment.
- Don't use `count = var.enabled ? 1 : 0` if `for_each = var.enabled ? toset(["main"]) : toset([])` makes the diff cleaner.
- Don't `terraform import` resources without also updating the `.tf` source so the import is reproducible.

---

## State file safety

- State lives in S3 (`${{ values.stateBucket }}`) with versioning and SSE-S3.
- Locking lives in DynamoDB (`${{ values.stateLockTable }}`), hash key `LockID`.
- If a `terraform apply` is interrupted, **do not** delete the lock entry blindly. Use `terraform force-unlock <LOCK_ID>` and explain why in the commit message.
- The S3 bucket has 90-day non-current version expiry. To roll back, use `aws s3api list-object-versions` then copy the previous version over the current state key.
- Never `terraform state rm` or `terraform state mv` without a corresponding `.tf` change committed in the same PR.

---

## Tagging strategy

Every taggable resource inherits these tags via `provider.default_tags`:

| Tag         | Value                              |
|-------------|------------------------------------|
| Project     | `var.project_name`                 |
| Environment | `var.environment`                  |
| ManagedBy   | `terraform`                        |
| Owner       | `${{ values.owner }}`              |
| Stack       | `${{ values.name }}`               |

Add organisation-wide extras via `var.additional_tags` (cost centre, compliance, etc.).
Only override on individual resources when the tag is genuinely resource-local
(e.g., `Name`, `Role`).

---

## Module layout

```
.
├── main.tf              Root: backend, provider, top-level resources
├── variables.tf         Root inputs (typed, validated)
├── outputs.tf           Root outputs
├── versions.tf          Terraform + provider version pins
├── backend-bootstrap/   One-shot module, local state
└── modules/             Reusable sub-modules (create as needed)
    └── <name>/
        ├── main.tf
        ├── variables.tf
        ├── outputs.tf
        └── README.md
```

When a sub-module grows past ~200 lines of `main.tf`, split it.

---

## Drift handling

1. `terraform plan -refresh-only` to see drift.
2. If the drift is intentional (someone edited the console), update the `.tf` to match, then `terraform apply` so state is consistent with code.
3. If the drift is **un**intentional, `terraform apply` to restore the declared state.
4. Never accept drift silently with `-refresh-only` + `apply` without a commit explaining why.

---

## When in doubt

- Read [docs/development.md](docs/development.md).
- Check `terraform-docs`-generated tables in each module's README.
- Ask the human. Don't guess at IAM, networking, or KMS.
