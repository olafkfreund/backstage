# ${{ values.name }}

${{ values.description }}

This is the TechDocs entry point for the **${{ values.name }}** Terraform
stack. The stack targets Microsoft Azure and stores its state in Azure Blob
Storage.

## What's inside

- AzureRM provider (~> 4.0)
- Remote state in `${{ values.stateStorageAccount }}` (container `tfstate`)
- Example Resource Group and Virtual Network
- Devenv-powered Nix flake for a reproducible dev shell
- GitHub Actions CI: `terraform fmt`, `terraform validate`, `tflint`

## Architecture

The scaffold ships with a minimal but realistic baseline:

```text
Subscription (${{ values.azureSubscriptionId }})
└── Resource Group (${{ values.name }}-rg, ${{ values.azureLocation }})
    └── Virtual Network (${{ values.name }}-vnet, 10.0.0.0/16)
        └── Subnet (default, 10.0.1.0/24)
```

Extend `main.tf` with your own resources, or split into multiple files as the
stack grows (`networking.tf`, `compute.tf`, `data.tf`, ...).

## State backend

State lives in Azure Blob Storage:

- **Resource group:** `${{ values.stateRG }}`
- **Storage account:** `${{ values.stateStorageAccount }}`
- **Container:** `tfstate`
- **Key:** `${{ values.name }}.tfstate`
- **Region:** `${{ values.azureLocation }}`

The storage account is created by the `backend-bootstrap/` stack with
versioning and soft-delete enabled. See [Development](development.md) for the
bootstrap procedure.

## Conventions

Human and AI contributors should follow `AGENTS.md` at the root of the
repository. Highlights:

- Always run `terraform fmt -recursive` before committing.
- Pin the `azurerm` provider to a single major (`~> 4.0`).
- Tag every resource with `environment`, `owner`, and `managed_by = "terraform"`.
- Never commit `terraform.tfvars` — only `terraform.tfvars.example`.
