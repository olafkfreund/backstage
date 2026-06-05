# AGENTS.md

Guardrails for humans and AI agents operating on this cluster.

## 1. kubectl context safety

- **Always** check your context before destructive commands:
  ```bash
  kubectx                          # current context
  kubectl config current-context   # explicit
  ```
- Prefer `kubectl --context=${{ values.clusterName }}` in scripts to avoid
  cross-cluster accidents.
- Never run `kubectl delete ns` without confirming the cluster and namespace.
- Use `--dry-run=client -o yaml` to preview any non-trivial change.

## 2. Terraform discipline

- Always `just plan` before `just apply`. Read the plan.
- Enable the S3 backend before sharing this repo with anyone else — local
  state is for solo bootstrap only.
- Don't `terraform destroy` from CI. It's gated behind `just destroy`
  intentionally.

## 3. Helm versioning

- Dependencies in `charts/baseline/Chart.yaml` are pinned to compatible
  ranges (`~>`). Bump explicitly:
  ```bash
  helm dependency update charts/baseline
  helm lint charts/baseline
  ```
- Upgrade in a non-prod cluster first. Traefik and cert-manager occasionally
  ship CRD-breaking changes.
- Track CRD migrations: `kubectl get crds | grep -E 'traefik|cert-manager'`.

## 4. IRSA (IAM Roles for Service Accounts)

- The Terraform stack creates an OIDC provider for the cluster. Use it instead
  of node IAM roles for workload AWS access.
- Pattern:
  ```hcl
  module "irsa_app" {
    source  = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"
    version = "~> 5.0"
    role_name = "my-app"
    oidc_providers = {
      main = {
        provider_arn               = module.eks.oidc_provider_arn
        namespace_service_accounts = ["my-app:my-app"]
      }
    }
  }
  ```
- Annotate the ServiceAccount with `eks.amazonaws.com/role-arn`.

## 5. Secrets management

Pick **one** and stick with it cluster-wide:

- **external-secrets** (preferred): syncs from AWS Secrets Manager / SSM via
  IRSA. Best for AWS-native stacks.
- **sealed-secrets** (Bitnami): encrypt at rest in git. Better when you don't
  want a cloud secret store dependency.

Do **not** mix both. Do **not** commit raw `Secret` manifests.

## 6. Autoscaling

- **Karpenter** is the recommended choice for new clusters: faster, simpler,
  bin-packs across instance types.
- **cluster-autoscaler** still works if you need ASG-only scaling.
- This template ships a single managed node group; add Karpenter as a
  follow-up if you outgrow it.

## 7. Observability

- Wire CloudWatch Container Insights via the `aws-cloudwatch-observability`
  EKS add-on (cheap, AWS-native).
- For Prom/Grafana, install `kube-prometheus-stack` in its own namespace; do
  not pile it into `charts/baseline`.

## 8. Network / cost guardrails

- Single-AZ NAT gateway is fine for dev (`single_nat_gateway = true`),
  multi-AZ for prod.
- `t3.medium` is good for ≤ ~30 small pods. Move to `m5.*` before you start
  hitting eviction.
- LoadBalancer services create ELBs that cost money and block VPC destruction.
  Prefer Ingress through Traefik.
