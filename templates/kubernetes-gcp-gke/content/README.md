# ${{ values.name }}

${{ values.description }}

GKE platform managed by Terraform, bootstrapped with a Helm baseline, and a Workload-Identity-bound example app.

- **GCP project:** `${{ values.gcpProject }}`
- **Region:** `${{ values.gcpRegion }}`
- **Cluster name:** `${{ values.clusterName }}`
- **Mode:** `${{ values.gkeMode }}`

## Prerequisites

- A GCP project with billing enabled (`${{ values.gcpProject }}`)
- Owner or sufficient IAM on that project to create GKE, networking, IAM bindings
- [Nix](https://nixos.org/download) with flakes enabled, and [direnv](https://direnv.net) (optional but recommended)

## Quick start

```bash
# 1. Enter the dev shell (devenv via flake)
direnv allow         # or: nix develop

# 2. Authenticate against GCP
gcloud auth login
gcloud auth application-default login
gcloud config set project ${{ values.gcpProject }}

# 3. Enable required GCP APIs (one-off)
just gcp-bootstrap

# 4. Provision the cluster
just tf-init
just tf-plan
just tf-apply

# 5. Wire kubectl up to the new cluster
just kube-creds

# 6. Install the baseline (Traefik + cert-manager) and the example app
just helm-baseline
just deploy-example

# 7. Sanity-check
kubectl get pods -A
kubectl get ingress -n example
```

## Layout

```text
.
├── flake.nix              # devenv-powered Nix dev shell
├── .envrc                 # direnv loader
├── justfile               # task runner
├── infra/                 # Terraform: VPC, GKE, IAM, WI
├── charts/baseline/       # Helm chart: Traefik + cert-manager
├── apps/example/          # Workload-Identity demo workload
├── docs/                  # TechDocs (MkDocs)
├── .github/workflows/     # CI
├── .claude/skills/        # Claude Code skill(s)
└── AGENTS.md              # AI-agent conventions
```

## Mode: ${{ values.gkeMode }}

This project is configured for **${{ values.gkeMode }}** mode. See [docs/development.md](docs/development.md) for the differences and how to switch.

## Documentation

Full docs live in `docs/` and are rendered as TechDocs. See [docs/index.md](docs/index.md).

## License

Internal — see your organization's policies.
