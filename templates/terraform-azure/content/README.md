# ${{ values.name }}

${{ values.description }}

Terraform stack targeting Microsoft Azure, scaffolded from the Backstage
`terraform-azure` template. State lives in Azure Blob Storage, the dev shell is
provided by a Nix flake powered by [devenv](https://devenv.sh), and CI runs via
GitHub Actions.

## Prerequisites

- [Nix](https://nixos.org/download) with flakes enabled
- [direnv](https://direnv.net/) (optional, but strongly recommended)
- An Azure subscription you can authenticate to via `az login`
- Owner (or equivalent) rights on the subscription to bootstrap the state backend

## Quickstart

```bash
# 1. Enter the dev shell (terraform, azure-cli, tflint, etc.)
direnv allow            # or: nix develop

# 2. Authenticate to Azure
az login
az account set --subscription ${{ values.azureSubscriptionId }}

# 3. Bootstrap the remote state backend (one-time, per environment)
cd backend-bootstrap
terraform init
terraform apply -var="location=${{ values.azureLocation }}" \
                -var="resource_group_name=${{ values.stateRG }}" \
                -var="storage_account_name=${{ values.stateStorageAccount }}"
cd ..

# 4. Initialise the main stack against the remote backend
cp terraform.tfvars.example terraform.tfvars
# edit terraform.tfvars to match your environment
terraform init
terraform plan
terraform apply
```

## Layout

```
.
├── backend-bootstrap/   # one-time bootstrap for the tfstate backend
├── docs/                # TechDocs source
├── .github/workflows/   # CI: fmt, validate, tflint
├── .claude/skills/      # Claude Code skills for this stack
├── main.tf              # primary resources
├── variables.tf         # input variables
├── outputs.tf           # exported outputs
├── versions.tf          # provider and Terraform version pins
├── terraform.tfvars.example
├── flake.nix            # devenv-powered dev shell
├── .envrc               # direnv hook
├── AGENTS.md            # conventions for AI assistants
└── catalog-info.yaml    # Backstage catalog entry
```

## Backend configuration

State is stored in an Azure Storage account using the AzureRM backend:

| Setting              | Value                              |
|----------------------|------------------------------------|
| Resource group       | `${{ values.stateRG }}`            |
| Storage account      | `${{ values.stateStorageAccount }}`|
| Container            | `tfstate`                          |
| Key                  | `${{ values.name }}.tfstate`       |
| Region               | `${{ values.azureLocation }}`      |

The `backend-bootstrap` directory contains a tiny stack that creates the
resource group, storage account, and container with versioning enabled. Run it
once per environment before `terraform init` in the root.

## CI authentication

The shipped GitHub Actions workflow runs `terraform fmt`, `terraform validate`
and `tflint`. To enable `terraform plan` in CI you must wire up Azure OIDC
federated identity (see `AGENTS.md` for the checklist). Once configured, add an
`az login --service-principal --federated-token` step and a `terraform plan`
job.

## Useful commands

```bash
terraform fmt -recursive
terraform validate
tflint --recursive
terraform-docs markdown table . > docs/reference.md
```
