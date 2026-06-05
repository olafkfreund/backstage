# backend-bootstrap

Creates the **S3 bucket** and **DynamoDB lock table** that the root
module's S3 backend depends on. Uses **local** state so there is no
chicken-and-egg.

Run once per AWS account/region, then commit the resulting state file.

```sh
terraform init
terraform apply \
  -var="bucket_name=${{ values.stateBucket }}" \
  -var="lock_table_name=${{ values.stateLockTable }}" \
  -var="region=${{ values.awsRegion }}"
```

What it creates:

- S3 bucket with versioning, SSE-S3 encryption, all public access blocked,
  and a 90-day non-current version expiration lifecycle rule.
- DynamoDB table with hash key `LockID` (the name Terraform requires),
  PAY_PER_REQUEST billing, server-side encryption, and PITR enabled.

After `apply` succeeds:

1. `git add backend-bootstrap/terraform.tfstate`
2. `git commit -m "bootstrap: create remote state backend"`
3. Go back to the repo root and run `terraform init`. It will detect the
   S3 backend and prompt to migrate state -- accept.
