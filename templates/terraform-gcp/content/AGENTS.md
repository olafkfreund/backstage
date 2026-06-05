# AGENTS.md

Conventions for any AI assistant (Claude Code, Cursor, Copilot, Aider, etc.)
working in this repository. Humans should follow them too.

## TL;DR

This is a Terraform 1.9+ project targeting **GCP project `${{ values.gcpProject }}`**
with a **GCS remote backend** at `gs://${{ values.stateBucket }}`. The dev
environment is a Nix flake using devenv — never instruct users to install
tooling globally.

## Do this

- **Read `versions.tf` first.** Match the pinned Terraform and provider major
  versions when writing code or examples.
- **Add new resources to `main.tf`** (or a new `*.tf` file at the root for a
  cohesive group, e.g. `iam.tf`, `network.tf`). Always declare matching
  inputs in `variables.tf` and meaningful outputs in `outputs.tf`.
- **Use `for_each` with maps**, not `count`, for resources whose set may
  change. It produces stable addresses and avoids destructive re-creation.
- **Pass labels via `local.default_labels`** and merge per-resource labels on
  top with `merge(local.default_labels, { ... })`.
- **Use the GA `google` provider** unless a feature is only available in
  `google-beta`; if you need beta, set `provider = google-beta` explicitly on
  that resource so the dependency is obvious.
- **Prefer regional resources** to multi-regional ones. Override to
  multi-regional only when there is a specific availability or data-locality
  requirement, and justify it in a comment.
- **Bucket state versioning stays ON.** Do not disable `versioning` on
  `google_storage_bucket.tfstate` in `backend-bootstrap/`. Lifecycle rules
  prune old versions; that is the right knob to tune.
- **Use Workload Identity Federation in CI**, never long-lived JSON keys. If
  you add a CI step that needs GCP credentials, wire up
  `google-github-actions/auth@v2` with WIF.
- **Use service-account impersonation locally**
  (`GOOGLE_IMPERSONATE_SERVICE_ACCOUNT`) rather than downloaded keys.
- **Apply least-privilege IAM.** Grant the smallest predefined role (or a
  custom role) at the smallest scope (resource > project > folder > org).
  Never grant `roles/owner` or `roles/editor` from Terraform.
- **Run `terraform fmt -recursive`** and `tflint` before proposing a diff.
  CI will fail otherwise.
- **Commit `.terraform.lock.hcl`.** It pins provider hashes per-platform.
- **Update `docs/`** when behaviour changes. Surface user-visible changes in
  `docs/index.md` and developer guidance in `docs/development.md`.

## Don't do this

- **Don't `terraform apply` from CI** without a reviewed plan artefact. Plan
  in PRs, apply on merge to `main` (or via a manual approval).
- **Don't store secrets in `*.tf`, `*.tfvars`, or environment variables
  committed to the repo.** Use Secret Manager and `google_secret_manager_secret_version`.
  `terraform.tfvars` is gitignored — keep it that way.
- **Don't change the backend `bucket` or `prefix`** in `main.tf` without
  migrating state first (`terraform init -migrate-state`). Doing so silently
  orphans existing state.
- **Don't downgrade provider versions** to work around a bug; pin a specific
  patched version with a comment instead.
- **Don't use `~/.config/gcloud/application_default_credentials.json` in CI.**
  It's fine for laptops; CI uses WIF.
- **Don't grant IAM with `google_project_iam_policy`** (authoritative — wipes
  everything else). Use `google_project_iam_binding` or, preferably,
  `google_project_iam_member`.
- **Don't pin `google` to an exact version** (`= 6.4.0`) unless working
  around a specific bug. `~> 6.0` keeps you on 6.x security updates.
- **Don't add bare `null_resource` + `local-exec` to paper over missing
  provider features.** Open an issue first and prefer a real resource.
- **Don't install tools globally.** Add them to `flake.nix` so every
  contributor and CI runner gets the same versions.

## When unsure

- Check `docs/development.md` for the local workflow.
- Check the [Google provider docs](https://registry.terraform.io/providers/hashicorp/google/latest/docs)
  for resource schemas; the version pinned in `versions.tf` is the source of truth.
- For GCP architecture decisions, prefer regional > multi-regional, GA >
  beta, predefined roles > custom roles, and impersonation > keys.
