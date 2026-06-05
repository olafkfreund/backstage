# backend-bootstrap

One-time stack that provisions the Azure Storage account used as the AzureRM
backend for the root Terraform stack.

Run this **once per environment**, before `terraform init` in the repository
root.

```bash
az login
az account set --subscription ${{ values.azureSubscriptionId }}

cd backend-bootstrap
terraform init
terraform apply
```

The stack uses the **local backend** on purpose — there is no chicken-and-egg
problem. After apply, commit the resulting `terraform.tfstate` only to an
out-of-band secure location (or, better, re-import into a second tfstate
backend in a different storage account once you have one).

Resources created:

- Resource group `${{ values.stateRG }}` in `${{ values.azureLocation }}`
- Storage account `${{ values.stateStorageAccount }}` (Standard_GRS, TLS 1.2,
  no public blob access, versioning + soft delete enabled)
- Container `tfstate` (private)

Both the resource group and storage account have `prevent_destroy = true` set
so `terraform destroy` will refuse to nuke them. To genuinely tear down, remove
the lifecycle block in a dedicated PR.
