# backend-bootstrap

One-time Terraform module that provisions the GCS bucket used as the remote
state backend for the parent project.

This module **must** be applied before `terraform init` succeeds in the parent
directory, because the GCS backend requires the bucket to already exist.

## Usage

```sh
terraform init
terraform apply \
  -var="project_id=${{ values.gcpProject }}" \
  -var="region=${{ values.gcpRegion }}" \
  -var="bucket_name=${{ values.stateBucket }}"
```

The bucket is created with:

- Object versioning enabled (keeps last 10 noncurrent versions)
- Uniform bucket-level access
- Public access prevention enforced
- Lifecycle rule that deletes archived objects older than 30 days

## State

This module uses a **local** state file. Either commit it (after reviewing it
for secrets — there shouldn't be any) or migrate it into the bucket it just
created under a different prefix:

```sh
cat >> backend.tf <<'EOF'
terraform {
  backend "gcs" {
    bucket = "${{ values.stateBucket }}"
    prefix = "backend-bootstrap/state"
  }
}
EOF
terraform init -migrate-state
```
