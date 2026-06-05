# ${{ values.name }}

${{ values.description }}

This Terraform project provisions infrastructure in GCP project
`${{ values.gcpProject }}`, with state stored remotely in
`gs://${{ values.stateBucket }}`.

## What this project manages

- A primary VPC network (`${{ values.name }}-vpc`) with custom subnetwork mode
- A regional subnetwork (`${{ values.name }}-subnet-${{ values.gcpRegion }}`) with
  private Google access and VPC flow logs enabled

Extend `main.tf` (and add new `*.tf` files at the root) to manage more.
Follow the guidance in [`AGENTS.md`](../AGENTS.md) and
[development.md](development.md).

## Architecture decisions

### State backend: GCS, regional, versioned

We use the **GCS backend** rather than Terraform Cloud or a local file. The
bucket is:

- **Regional** (`${{ values.gcpRegion }}`) — cheaper than multi-region and
  sufficient for state, which we can recreate from local replicas if a region
  fails.
- **Versioned** — every state write keeps the prior object as a noncurrent
  version. The lifecycle rule keeps the last 10 noncurrent versions and
  expires archived objects after 30 days.
- **Uniform bucket-level access + public access prevention** — IAM applies at
  the bucket level and the bucket cannot be made public, even by accident.

### Provider versions

Pinned in `versions.tf` to `~> 6.0` for both `google` and `google-beta`. The
`~>` operator means "compatible with 6.x". Bumping the major version is a
reviewed change because it can introduce breaking schema changes.

### IAM strategy

- **Local dev:** Application Default Credentials via `gcloud auth
  application-default login`, optionally with
  `GOOGLE_IMPERSONATE_SERVICE_ACCOUNT` to assume a deploy SA.
- **CI:** Workload Identity Federation between GitHub Actions and GCP. No
  long-lived JSON keys.
- **Resources:** least-privilege via `google_project_iam_member` (additive),
  never `google_project_iam_policy` (authoritative — would wipe out
  unmanaged bindings).

### Regional vs multi-regional resources

Default to **regional** resources. Use multi-regional only when the resource
specifically supports it *and* the workload requires it (e.g. global load
balancers, multi-region Spanner). Multi-region resources cost more and have
different failure modes; document the choice with a code comment when you
make it.
