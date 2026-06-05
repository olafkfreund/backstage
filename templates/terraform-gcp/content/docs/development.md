# Development

## Toolchain

Everything you need is in `flake.nix`. Open a shell with:

```sh
nix develop          # one-shot
# or
direnv allow         # auto-load on cd
```

You get: `terraform`, `gcloud`, `tflint`, `terraform-docs`, `pre-commit`,
`just`, plus utilities (`jq`, `yq`, `git`). No global installs required.

## Local workflow

```sh
# Format
terraform fmt -recursive

# Static analysis
tflint --init
tflint --recursive

# Validate (no backend, no credentials needed)
terraform init -backend=false
terraform validate

# Plan / apply (needs GCP credentials and backend bucket)
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

A `Justfile` recipe bundle is included — `just --list` to see them.

## Pre-commit

Install hooks once: `pre-commit install`. The configured hooks mirror what CI
runs, so commits that pass locally will pass in CI.

## Authenticating to GCP

### Laptop

```sh
gcloud auth login
gcloud auth application-default login
gcloud config set project ${{ values.gcpProject }}
```

Optionally impersonate a service account:

```sh
export GOOGLE_IMPERSONATE_SERVICE_ACCOUNT="terraform@${{ values.gcpProject }}.iam.gserviceaccount.com"
```

### CI

Use Workload Identity Federation — see the TODO in `README.md`. Don't add
long-lived JSON keys.

## Adding a resource

1. Add the resource block to `main.tf` (or a new `*.tf` file at the root).
2. Add any new inputs to `variables.tf`, with type, description, and a
   validation block where applicable.
3. Expose anything other modules or operators need via `outputs.tf`.
4. Add `default_labels` via `merge(local.default_labels, { ... })`.
5. Run `terraform fmt -recursive && tflint && terraform validate`.
6. Open a PR. CI runs `nix flake check`, which runs fmt, validate, and
   tflint inside the same devShell.

The `.claude/skills/add-resource.md` skill encodes this checklist for AI
assistants.

## Common failure modes

- **`Error: Backend initialization required`** — you changed the backend
  block. Run `terraform init -migrate-state` (or `-reconfigure` if you're
  sure).
- **`Error: googleapi: Error 403: ... requires permission ...`** — your ADC
  user or impersonated SA lacks an IAM role. Check
  `gcloud projects get-iam-policy ${{ values.gcpProject }}`.
- **`Error: state snapshot was created by Terraform v1.X, which is newer`** —
  someone else applied with a newer Terraform. Match the version in
  `versions.tf` (or bump it).
- **`terraform plan` shows changes you didn't make** — usually drift from
  someone editing the console. Either re-apply or import the change.
