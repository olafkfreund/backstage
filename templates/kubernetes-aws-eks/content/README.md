# ${{ values.name }}

${{ values.description }}

AWS EKS cluster provisioned by Terraform with a baseline Helm chart (Traefik +
cert-manager) and an example workload. Local toolchain is fully pinned via Nix
flake + devenv.

## Cluster facts

| | |
|---|---|
| Cluster name | `${{ values.clusterName }}` |
| Region | `${{ values.awsRegion }}` |
| Node instance type | `${{ values.nodeInstanceType }}` |
| Owner | `${{ values.owner }}` |

## Prerequisites

- Nix with flakes enabled (`nix --version` >= 2.18)
- `direnv` (optional, recommended)
- AWS credentials (use `aws-vault` or env vars) with rights to create VPC, EKS,
  IAM, and EC2 resources in `${{ values.awsRegion }}`
- A registered DNS zone if you want real TLS via the included Let's Encrypt
  ClusterIssuer

## Quick start

```bash
# 1. Enter the pinned dev shell (terraform, kubectl, helm, awscli2, ...)
direnv allow              # or: nix develop

# 2. Authenticate to AWS (pick your flavour)
aws-vault exec my-profile -- $SHELL

# 3. Provision the cluster (~15 minutes)
just plan
just apply

# 4. Wire kubectl up to the new cluster
just kubeconfig
kubectl get nodes

# 5. Install the baseline (Traefik + cert-manager)
just install-baseline

# 6. Deploy the example app
just deploy-example
kubectl -n example get pods,svc,ingress
```

## Layout

```
infra/                 Terraform: VPC + EKS + IAM OIDC for IRSA
charts/baseline/       Umbrella Helm chart (Traefik + cert-manager + ClusterIssuer)
apps/example/          Sample nginx Deployment + Service + Ingress
.github/workflows/     CI: terraform fmt, helm lint, kubectl dry-run
flake.nix              Pinned dev toolchain via devenv
justfile               Task runner for the common ops flows
```

## Day-2

- Enable the S3 backend in `infra/main.tf` once you have a bucket + DynamoDB
  lock table. Commented stub is included.
- Add IRSA roles via the `eks_managed_node_groups` outputs (`oidc_provider_arn`).
- For secrets, prefer [external-secrets](https://external-secrets.io/) with AWS
  Secrets Manager. See [`AGENTS.md`](./AGENTS.md).
- For autoscaling, prefer [Karpenter](https://karpenter.sh/) over the legacy
  cluster-autoscaler for new clusters.

## Teardown

```bash
just destroy            # destroys EVERYTHING in this stack
```

Make sure no LoadBalancer services are left behind — they will block VPC
destruction. The `destroy` target deletes them first.
