# Agent conventions for ${{ values.name }}

Any AI coding assistant (Claude Code, Cursor, Copilot, Aider, etc.) working in this repo reads this file. Follow it precisely.

## Stack at a glance

- **Cloud:** Google Cloud, project `${{ values.gcpProject }}`, region `${{ values.gcpRegion }}`
- **Cluster:** GKE `${{ values.clusterName }}`, mode **${{ values.gkeMode }}**
- **IaC:** Terraform (`infra/`), modules from `terraform-google-modules/kubernetes-engine`
- **Apps:** Helm (`charts/baseline/`) + raw manifests (`apps/example/`)
- **Dev shell:** Nix flake using devenv (`flake.nix`)
- **Task runner:** `just`

## Do

- Use the dev shell. Run `nix develop` or `direnv allow` before any tooling. Do not `brew install` or `apt install` cluster tools.
- Run `just tf-fmt && just tf-validate` before opening a PR touching `infra/`.
- Run `just helm-lint` before opening a PR touching `charts/`.
- Keep Terraform state in GCS. Uncomment the `backend "gcs"` block in `infra/versions.tf` and set the bucket the first time you `tf-init`.
- Prefer Workload Identity over node service accounts or downloaded JSON keys. Bind KSAs to GSAs explicitly in Terraform.
- Pin all module and provider versions. No floating `~>` on majors for production.
- Pin all container images by digest in `apps/example/` once stable.
- Default `gkeMode` is `autopilot`. Keep Standard-only knobs gated behind `var.gke_mode == "standard"` in Terraform.
- Use GKE [release channels](https://cloud.google.com/kubernetes-engine/docs/concepts/release-channels). Default is `regular`. Touch only with intent.
- Use Terraform `for_each` over `count` when you might re-order resources.
- Run `kubectl --dry-run=client -o yaml` and `--dry-run=server` against the live API before applying anything by hand.
- Tag everything with the `app`, `system`, and `owner` labels declared in `catalog-info.yaml`.

## Don't

- Don't commit service account JSON keys. Use `gcloud auth application-default login` or Workload Identity Federation from CI.
- Don't enable both Autopilot AND a `google_container_node_pool` resource in the same workspace — Autopilot manages node pools for you.
- Don't disable VPC-native (alias IP) networking. The module is wired to require it.
- Don't run `terraform apply -auto-approve` from a developer machine against shared envs. CI only, with a reviewed plan.
- Don't grant the GKE node SA `roles/owner`. Grant the *workload's* GSA the minimum it needs.
- Don't pin Kubernetes versions in YAML manifests as the latest unstable. GKE controls the control plane version via the release channel.
- Don't hand-edit resources that Terraform owns. If you need to drift, codify it first.
- Don't use `latest` tags in production manifests.
- Don't bypass `helm lint` failures — fix the chart.
- Don't introduce a second state backend. One GCS bucket, one prefix per environment.

## Autopilot vs Standard — what to suggest

| Question | Autopilot | Standard |
|---|---|---|
| Who manages nodes? | Google | You |
| Per-pod billing? | Yes | No, per-node |
| Custom machine types / GPUs? | Limited | Full control |
| DaemonSets requiring host access? | Restricted | Allowed |
| Privileged containers? | No | Yes (if you must) |
| Cluster autoscaler tuning? | Not exposed | Exposed |
| Best for | Most workloads, low ops overhead | GPU/ML, niche kernels, strict node-level control |

If the agent is asked "should I move to Standard?", the answer is almost always **no** unless the user has a concrete reason (GPU, DaemonSet limitation, or a CNI requirement Autopilot doesn't support).

## Workload Identity Federation

- The cluster has `workload_identity_config.workload_pool = "<project>.svc.id.goog"`.
- Bind a Kubernetes ServiceAccount (KSA) to a Google ServiceAccount (GSA) via an IAM policy on the GSA: role `roles/iam.workloadIdentityUser`, member `serviceAccount:<project>.svc.id.goog[<ns>/<ksa>]`.
- Annotate the KSA with `iam.gke.io/gcp-service-account: <gsa-email>`.
- For CI authenticating to GCP, use **Workload Identity Federation from GitHub Actions** (OIDC), not JSON keys. The `auth` step in CI is wired for that — set `WIF_PROVIDER` and `WIF_SERVICE_ACCOUNT` secrets.

## State, locking, and concurrency

- State lives in `gs://<state-bucket>/${{ values.name }}/` (set in `infra/versions.tf`).
- GCS backend uses object generations as the lock. Don't add an extra DynamoDB-style lock — it's not needed.
- Never run `terraform force-unlock` without coordinating in chat first.

## When in doubt

- Read `docs/development.md`.
- Run `just --list` to see every task.
- Prefer adding a new `just` recipe over a one-off shell snippet.
