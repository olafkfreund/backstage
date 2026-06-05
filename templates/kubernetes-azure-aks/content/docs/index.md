# ${{ values.name }}

${{ values.description }}

## Cluster facts

| Field | Value |
|---|---|
| Cluster name | `${{ values.clusterName }}` |
| Region | `${{ values.azureLocation }}` |
| Subscription | `${{ values.azureSubscriptionId }}` |
| Node VM size | `${{ values.nodeVmSize }}` |
| Owner | `${{ values.owner }}` |

## Architecture

```
        ┌──────────────────────────────┐
        │   Azure Resource Group       │
        │  rg-${{ values.name }}              │
        │                              │
        │  ┌────────────────────────┐  │
        │  │ AKS: ${{ values.clusterName }} │  │
        │  │  - OIDC issuer ON      │  │
        │  │  - Workload Identity   │  │
        │  │  - Cilium / Azure CNI  │  │
        │  └──────────┬─────────────┘  │
        └─────────────┼────────────────┘
                      │
              ┌───────┴────────┐
              │  Traefik       │  → public LB
              │  cert-manager  │  → ACME HTTP-01
              └────────────────┘
```

## Why workload identity

We use **Azure AD Workload Identity** (federated tokens) — not AAD Pod Identity v1,
which is deprecated. Pods authenticate to Azure as a User-Assigned Managed Identity by
way of a Kubernetes ServiceAccount annotated with `azure.workload.identity/client-id`.

See `apps/example/serviceaccount.yaml` for the binding.

## Operations

- `just plan` / `just apply` — Terraform lifecycle
- `just kubeconfig` — merge cluster credentials into `~/.kube/config`
- `just install-baseline` — install Traefik + cert-manager + ClusterIssuer
- `just deploy-example` — apply the example app
- `just destroy` — tear it all down (careful)

## Upgrades

AKS auto-upgrade channel is `patch`. For minor version bumps:

1. Bump `kubernetes_version` in `infra/variables.tf`.
2. `just plan` to see the rolling upgrade impact.
3. `just apply` during a maintenance window.
