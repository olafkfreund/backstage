# ${{ values.name }}

> ${{ values.description }}

Production-ready Terraform stack targeting AWS region **${{ values.awsRegion }}**.
State is stored remotely in S3 with DynamoDB-based locking.

- **State bucket**: `${{ values.stateBucket }}`
- **Lock table**: `${{ values.stateLockTable }}`
- **Default region**: `${{ values.awsRegion }}`

---

## Prerequisites

1. [Nix](https://nixos.org/download) with flakes enabled.
2. [direnv](https://direnv.net/) (optional but strongly recommended) so `.envrc`
   automatically loads the devenv shell on `cd`.
3. AWS credentials available to the shell (env vars, `aws-vault`,
   SSO, or an OIDC role assumed in CI). The dev shell does **not** ship any
   credentials.

Drop into the dev shell:

```sh
nix develop      # or: direnv allow
```

You now have `terraform`, `awscli2`, `aws-vault`, `tflint`, `terraform-docs`,
`pre-commit`, and `just` on PATH at pinned versions. Verify:

```sh
terraform version   # >= 1.9.0
aws --version
tflint --version
```

---

## One-time backend bootstrap

> **You MUST run this BEFORE your first `terraform init` on the root module.**

The root module declares an S3 backend pointing at `${{ values.stateBucket }}`
and `${{ values.stateLockTable }}`. Those resources do not exist yet on a
fresh AWS account, so `terraform init` would fail with `NoSuchBucket`. The
`backend-bootstrap/` sub-directory creates them using **local** state, which
you then commit to the repo so the next operator can audit the bootstrap.

```sh
cd backend-bootstrap
terraform init
terraform apply \
  -var="bucket_name=${{ values.stateBucket }}" \
  -var="lock_table_name=${{ values.stateLockTable }}" \
  -var="region=${{ values.awsRegion }}"
cd ..
```

The bootstrap module enables bucket versioning, default SSE-S3 encryption,
and fully blocks public access. After it succeeds, commit the resulting
`backend-bootstrap/terraform.tfstate` so the bootstrap is reproducible and
auditable.

---

## Day-to-day workflow

```sh
just init        # terraform init (uses the S3 backend)
just fmt         # terraform fmt -recursive
just validate    # terraform validate
just lint        # tflint --recursive
just plan        # terraform plan -out=tfplan
just apply       # terraform apply tfplan
just docs        # regenerate per-module READMEs via terraform-docs
```

Copy `terraform.tfvars.example` to `terraform.tfvars` and edit it to suit
your environment. **Do not commit `terraform.tfvars`**.

---

## Layout

```
.
├── flake.nix              Nix flake + devenv shell
├── .envrc                 direnv hook
├── main.tf                Root: provider, backend, example VPC
├── variables.tf           Typed input variables
├── outputs.tf             Root outputs (vpc_id, vpc_cidr, ...)
├── versions.tf            Pinned Terraform + provider versions
├── terraform.tfvars.example
├── backend-bootstrap/     One-time S3 + DynamoDB bootstrap
├── docs/                  TechDocs sources
├── .github/workflows/     CI: fmt, validate, tflint
├── .claude/skills/        Claude Code skills (add-resource)
├── AGENTS.md              Conventions for AI agents working in this repo
└── catalog-info.yaml      Backstage catalog entry
```

---

## CI

GitHub Actions runs on every push and PR:

- `nix flake check`
- `terraform fmt -check -recursive`
- `terraform validate`
- `tflint --recursive`

See `.github/workflows/ci.yml`. The workflow has a commented-out OIDC step
that assumes an AWS role for `terraform plan` against real infrastructure --
uncomment it once you have provisioned the role.

---

## Further reading

- [`AGENTS.md`](./AGENTS.md) -- conventions for AI assistants editing this repo.
- [`docs/`](./docs/) -- TechDocs source, rendered in Backstage.
