# Agent Notes — ${{ values.name }}

Guidance for AI agents (and humans) working on this AKS project.

## Module pinning

- `azurerm` provider is pinned to `~> 4.0` in `infra/versions.tf`. Do **not** bump to
  4.x major without re-reading the upgrade guide — there are breaking renames around
  `azurerm_kubernetes_cluster` blocks (`network_profile`, `default_node_pool`).
- `kubernetes` provider stays at `~> 2.0`.
- Terraform itself is pinned `>= 1.9`.

## Identity model

**Use Workload Identity (federated OIDC tokens). Never re-introduce AAD Pod Identity v1.**

- `oidc_issuer_enabled = true` and `workload_identity_enabled = true` on the cluster.
- Workloads bind to a User-Assigned Managed Identity via a federated credential
  scoped to `system:serviceaccount:<ns>:<sa>`.
- Pods opt in with `metadata.labels."azure.workload.identity/use" = "true"`.
- The ServiceAccount carries `azure.workload.identity/client-id` annotation.

Do not create `AzureIdentity` / `AzureIdentityBinding` CRDs — those belong to the
deprecated v1 model.

## Managed identity scope

- Control plane uses a **system-assigned managed identity** (created by AKS itself).
- Per-workload identities are **user-assigned managed identities** living in the same
  resource group as the cluster.
- Grant RBAC at the **smallest scope that works** — prefer resource-level over
  subscription-level role assignments.
- For ACR pulls, prefer `az aks update --attach-acr` (kubelet identity gets `AcrPull`).
  Avoid `imagePullSecrets` unless pulling from non-Azure registries.

## ACR pull secrets

- Default path: attach ACR to AKS so the kubelet identity has `AcrPull`. No secret in
  the cluster.
- If you must use a non-Azure registry, store the docker-config in Azure Key Vault and
  sync into the cluster with the Key Vault CSI driver — never check pull creds into git.

## AKS upgrade strategy

- `automatic_channel_upgrade = "patch"` keeps patch versions current with zero churn.
- For minor versions:
  1. Check the [AKS release notes](https://github.com/Azure/AKS/releases) for breaking changes.
  2. Bump `kubernetes_version` in `infra/variables.tf`.
  3. `terraform plan` — confirm it's a **rolling** upgrade, not a recreate.
  4. Apply during a maintenance window. `surge` defaults are usually fine.
- Never skip minor versions (1.28 → 1.30). Go one at a time.

## Things not to do

- ❌ Hardcode subscription IDs / tenant IDs in `.tf` files — use variables.
- ❌ Store kubeconfig in the repo.
- ❌ Use `kubectl apply -f` from CI without `--dry-run=client` first.
- ❌ Add `cluster-admin` RoleBindings to workload ServiceAccounts.
- ❌ Disable RBAC, network policy, or the OIDC issuer.
