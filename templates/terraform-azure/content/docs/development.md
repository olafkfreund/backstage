# Development

## Entering the dev shell

The repository ships with a Nix flake that uses [devenv](https://devenv.sh) to
assemble a reproducible toolchain. With direnv installed:

```bash
direnv allow
```

Without direnv:

```bash
nix develop
```

The shell provides:

- `terraform` (>= 1.9)
- `azure-cli`
- `tflint`
- `terraform-docs`
- `pre-commit`
- `just`

## Authenticating to Azure

```bash
az login
az account set --subscription ${{ values.azureSubscriptionId }}
az account show
```

For non-interactive automation use a service principal or, preferably, OIDC
federated credentials (see `AGENTS.md`).

## Bootstrapping the state backend

A dedicated `backend-bootstrap/` stack creates the resource group and storage
account that hold the Terraform state. Run it **once per environment** before
you run `terraform init` in the root.

```bash
cd backend-bootstrap
terraform init
terraform apply \
  -var="location=${{ values.azureLocation }}" \
  -var="resource_group_name=${{ values.stateRG }}" \
  -var="storage_account_name=${{ values.stateStorageAccount }}"
cd ..
```

The bootstrap stack enables blob versioning, soft-delete, and disables public
blob access on the storage account.

## Initialising the main stack

```bash
cp terraform.tfvars.example terraform.tfvars
# edit terraform.tfvars
terraform init
terraform plan -out tfplan
terraform apply tfplan
```

## Day-to-day commands

```bash
terraform fmt -recursive          # format every file
terraform validate                # type-check the configuration
tflint --recursive --init         # lint
terraform-docs markdown table .   # regenerate provider/resource tables
```

A `justfile` is available in the dev shell — try `just --list`.

## Adding resources

1. Define inputs in `variables.tf`.
2. Add the resource block(s) in `main.tf` (or a topic-specific file).
3. Expose any consumer-relevant attributes in `outputs.tf`.
4. Run `terraform fmt -recursive && terraform validate && tflint`.
5. Run `terraform plan` and review the diff carefully.
6. Commit with a Conventional Commits message, e.g. `feat(network): add bastion subnet`.

If the change is non-trivial, see `.claude/skills/add-resource.md` for the
step-by-step recipe used by AI assistants.

## Troubleshooting

- **`Error: building AzureRM Client: obtain subscription` ** — run `az login`
  and `az account set --subscription <id>`.
- **`StorageAccountNotFound` on `terraform init`** — the backend bootstrap has
  not been run, or the storage account name does not match.
- **State lock stuck** — `terraform force-unlock <LOCK_ID>`. Confirm no other
  apply is in flight before doing this.
