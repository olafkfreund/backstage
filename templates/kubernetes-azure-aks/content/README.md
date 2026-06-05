# ${{ values.name }}

${{ values.description }}

Azure Kubernetes Service (AKS) cluster provisioned by Terraform, with a baseline Helm
chart bundling Traefik (ingress) and cert-manager (Let's Encrypt), and an example app
wired up with Azure Workload Identity.

## Stack

- **Infrastructure**: Terraform (azurerm ~> 4.0) → AKS in `${{ values.azureLocation }}`
- **Ingress / TLS**: Traefik + cert-manager (Let's Encrypt HTTP-01)
- **Identity**: Workload Identity (OIDC) — no pod identity v1, no secrets in pods
- **Tooling**: Nix flake + devenv, `just` task runner

## Prerequisites

- [Nix](https://nixos.org/download) with flakes enabled, or:
  - Terraform >= 1.9, Azure CLI, kubectl, helm, just
- An Azure subscription (`${{ values.azureSubscriptionId }}`) and contributor rights
- A registered application / service principal for Terraform, or interactive `az login`

## Quick start

```bash
# 1. Enter the dev shell (brings in terraform, az, kubectl, helm, k9s, just, ...)
nix develop          # or: direnv allow

# 2. Authenticate to Azure
az login
az account set --subscription ${{ values.azureSubscriptionId }}

# 3. Provision the cluster
just plan
just apply

# 4. Grab kubeconfig
just kubeconfig

# 5. Install Traefik + cert-manager baseline
just install-baseline

# 6. Deploy the example workload-identity app
just deploy-example
```

## Layout

```
infra/                  # Terraform: AKS, RG, OIDC, workload identity
charts/baseline/        # Helm umbrella chart: traefik + cert-manager + ClusterIssuer
apps/example/           # Example app with WI ServiceAccount
.github/workflows/      # CI: fmt/lint/dry-run
```

## What's enabled by default

- **OIDC issuer** on the AKS API server (`oidc_issuer_enabled = true`)
- **Workload Identity** (`workload_identity_enabled = true`) — federated tokens, no
  client secrets, no deprecated AAD Pod Identity v1
- **Azure CNI overlay** networking with **Cilium** dataplane
- **System-assigned managed identity** for the cluster control plane
- **Auto-upgrade** channel: `patch`

## Documentation

Full docs (rendered by TechDocs / mkdocs-material): `mkdocs serve`

## Owner

${{ values.owner }}
