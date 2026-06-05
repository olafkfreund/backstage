# Development

## Entering the dev shell

```bash
# With direnv
direnv allow

# Or directly
nix develop
```

The shell exposes: `terraform`, `gcloud`, `kubectl`, `helm`, `k9s`, `stern`, `kubectx`, `kubens`, `just`, `tflint`, `terraform-docs`, `jq`, `yq`, `pre-commit`.

## Authenticating against GCP

```bash
gcloud auth login
gcloud auth application-default login
gcloud config set project ${{ values.gcpProject }}
```

For CI, prefer **Workload Identity Federation** over downloaded JSON keys. The included CI workflow shows the pattern.

## One-off GCP bootstrap

Enable the APIs the project will need:

```bash
just gcp-bootstrap
```

This enables: `compute`, `container`, `iam`, `iamcredentials`, `cloudresourcemanager`, `serviceusage`, `artifactregistry`.

## Remote state (GCS backend)

1. Create a state bucket (versioned, uniform access):

   ```bash
   gsutil mb -p ${{ values.gcpProject }} -l ${{ values.gcpRegion }} -b on gs://${{ values.gcpProject }}-tfstate
   gsutil versioning set on gs://${{ values.gcpProject }}-tfstate
   ```

2. Uncomment the `backend "gcs"` block in `infra/versions.tf` and set `bucket` and `prefix`.
3. `just tf-init` will migrate state on first run.

## Provisioning the cluster

```bash
just tf-init
just tf-plan
just tf-apply
```

On success, Terraform outputs include the cluster endpoint and the kubeconfig command.

## Talking to the cluster

```bash
just kube-creds
kubectl get nodes
kubectx ${{ values.clusterName }}
```

## Installing the baseline

Traefik + cert-manager are packaged as an umbrella chart in `charts/baseline/`:

```bash
just helm-baseline
```

Verify:

```bash
kubectl -n traefik get pods
kubectl -n cert-manager get pods
```

## Deploying the example app

```bash
just deploy-example
kubectl -n example get all
kubectl -n example get ingress
```

The example workload runs under a Kubernetes ServiceAccount bound to a Google ServiceAccount via Workload Identity. See `apps/example/serviceaccount.yaml` and the IAM binding in `infra/main.tf`.

## Switching modes (Autopilot ↔ Standard)

- Set the `gke_mode` variable in `infra/variables.tf` (or via `-var`).
- **Switching is destructive**. Terraform will plan a replacement of the cluster.
- For production, create a new cluster in the new mode, migrate workloads, then destroy the old one.

## Release channels

GKE manages control-plane versions via release channels. We default to `regular`. Override with `var.release_channel` (`rapid`, `regular`, `stable`).

## Node-pool autoscaling (Standard mode only)

When `gke_mode = "standard"`, the included node pool uses cluster autoscaler with the bounds in `var.standard_node_pool`. Tune `min_count`, `max_count`, `machine_type`, and `disk_size_gb` per environment.

Autopilot does its own autoscaling per pod — no knobs.

## Linting and pre-commit

```bash
just tf-fmt
just tf-validate
just helm-lint
just kube-dry-run
```

## Tearing it down

```bash
just tf-destroy
```

This removes the cluster and VPC. State and the state bucket are left alone.

## Troubleshooting

- **`Permission denied (workload identity)`** — Check the KSA annotation `iam.gke.io/gcp-service-account` matches the GSA email, and the GSA has the IAM binding `roles/iam.workloadIdentityUser` for the KSA principal.
- **`Error 403: googleapi: Cluster ... not found`** — `gcloud config set project` and re-run `just kube-creds`.
- **Terraform state lock stuck** — Don't `force-unlock` without coordinating. GCS uses object-generation locks; an interrupted apply may leave the lock until the GCS object is deleted.
- **Ingress without a public IP** — Traefik provisions a `LoadBalancer` Service. Check `kubectl -n traefik get svc` and the GCP quotas in your region.
