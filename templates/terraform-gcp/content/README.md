# ${{ values.name }}

${{ values.description }}

Terraform project targeting Google Cloud Platform with a GCS remote backend, a
Nix devShell (powered by [devenv](https://devenv.sh)) for reproducible tooling,
and CI that runs `nix flake check`.

- **GCP project:** `${{ values.gcpProject }}`
- **Default region:** `${{ values.gcpRegion }}`
- **State bucket:** `gs://${{ values.stateBucket }}`

---

## Prerequisites

- [Nix](https://nixos.org/download) with flakes enabled (`experimental-features = nix-command flakes`)
- [direnv](https://direnv.net) (optional, but recommended — `.envrc` is provided)
- A Google Cloud account with permission to create GCS buckets and the
  resources this project manages
- `gcloud` CLI for the initial bootstrap (it is also included in the devShell)

## 1. Enter the dev environment

With direnv:

```sh
direnv allow
```

Or without:

```sh
nix develop
```

You now have `terraform`, `gcloud`, `tflint`, `terraform-docs`, `pre-commit`,
and `just` on your `PATH` — pinned to the versions declared in `flake.nix`.

Install pre-commit hooks once:

```sh
pre-commit install
```

## 2. Authenticate to GCP

For local development we use Application Default Credentials (ADC) via user
impersonation. **Never** check service-account keys into the repo.

```sh
gcloud auth login
gcloud auth application-default login
gcloud config set project ${{ values.gcpProject }}
```

If you have a deploy service account, prefer impersonation:

```sh
export GOOGLE_IMPERSONATE_SERVICE_ACCOUNT="terraform@${{ values.gcpProject }}.iam.gserviceaccount.com"
```

## 3. Bootstrap the state bucket (one-time)

The main Terraform configuration uses a GCS remote backend, but that bucket
has to exist first. A separate, minimal Terraform configuration in
`backend-bootstrap/` provisions it with versioning, uniform bucket-level
access, and a lifecycle policy. Its own state is stored locally and then
committed via the `terraform.tfstate` file in that directory (or migrated to
the bucket it just created — your call).

```sh
cd backend-bootstrap
terraform init
terraform apply \
  -var="project_id=${{ values.gcpProject }}" \
  -var="region=${{ values.gcpRegion }}" \
  -var="bucket_name=${{ values.stateBucket }}"
cd ..
```

## 4. Initialise and use the main configuration

```sh
cp terraform.tfvars.example terraform.tfvars
# edit terraform.tfvars if you want non-default values

terraform init
terraform fmt -recursive
terraform validate
tflint
terraform plan -out=tfplan
terraform apply tfplan
```

A `Justfile` wraps the most common commands — run `just --list` to see them.

## 5. CI

GitHub Actions installs Nix and runs `nix flake check`, which executes
`terraform fmt -check`, `terraform validate`, and `tflint` inside the same
devShell developers use locally. See `.github/workflows/ci.yml`.

> **TODO — Workload Identity Federation:** the CI workflow currently does
> *not* authenticate to GCP, because it only runs static checks. When you add
> a `terraform plan` step in CI, wire up Workload Identity Federation between
> GitHub Actions and GCP (see
> <https://github.com/google-github-actions/auth#setting-up-workload-identity-federation>)
> rather than storing long-lived service-account keys as secrets.

## Repository layout

```
.
├── backend-bootstrap/       # one-time GCS state bucket provisioning
├── docs/                    # TechDocs (mkdocs)
├── .github/workflows/ci.yml # `nix flake check`
├── .claude/skills/          # Claude Code skills for this repo
├── flake.nix                # devShell (devenv) + flake checks
├── main.tf                  # primary Terraform configuration
├── variables.tf
├── outputs.tf
├── versions.tf              # version pins
├── terraform.tfvars.example
├── AGENTS.md                # conventions any AI assistant should follow
└── catalog-info.yaml        # Backstage catalog entry
```

## Further reading

- [AGENTS.md](./AGENTS.md) — conventions for AI assistants and humans alike
- [docs/](./docs) — TechDocs source (mkdocs)
- [Terraform Google provider](https://registry.terraform.io/providers/hashicorp/google/latest/docs)
- [GCS backend](https://developer.hashicorp.com/terraform/language/settings/backends/gcs)
