# ${{ values.name }}

${{ values.description }}

A GKE platform on Google Cloud, provisioned with Terraform and bootstrapped with a Helm baseline (Traefik + cert-manager). Includes a Workload-Identity-bound example application.

## Topology

```mermaid
flowchart LR
  dev[Developer] -- nix develop --> shell[devenv shell]
  shell -- terraform --> tf[Terraform state in GCS]
  tf --> vpc[VPC + subnets]
  tf --> gke[GKE cluster - ${{ values.gkeMode }}]
  tf --> wi[Workload Identity pool]
  shell -- helm --> baseline[Baseline chart - Traefik + cert-manager]
  shell -- kubectl --> app[Example app - WI bound]
  gke -.-> baseline
  gke -.-> app
```

## Configuration summary

| Setting | Value |
|---|---|
| GCP project | `${{ values.gcpProject }}` |
| Region | `${{ values.gcpRegion }}` |
| Cluster name | `${{ values.clusterName }}` |
| Mode | `${{ values.gkeMode }}` |
| Networking | VPC-native (alias IP) |
| Workload Identity | Enabled |
| Release channel | `regular` |

## What you get out of the box

- A regional GKE cluster (Autopilot or Standard based on `gkeMode`)
- VPC-native networking with dedicated subnet ranges for pods and services
- Workload Identity enabled and ready to bind GSAs to KSAs
- A Helm-managed baseline:
  - **Traefik** as the ingress controller
  - **cert-manager** for TLS certificate issuance
- An example application demonstrating Workload Identity end-to-end
- A reproducible dev environment via Nix + devenv
- CI that validates Terraform, lints Helm, and dry-runs manifests

## Where to go next

- [Development](development.md) — every command and workflow
- [`AGENTS.md`](https://github.com/${{ values.destination.owner }}/${{ values.destination.repo }}/blob/main/AGENTS.md) — conventions for AI assistants
