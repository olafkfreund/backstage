# ${{ values.name }}

${{ values.description }}

This stack provisions AWS resources using Terraform 1.9+ against region
**${{ values.awsRegion }}**, with remote state in S3 (`${{ values.stateBucket }}`)
and state locking in DynamoDB (`${{ values.stateLockTable }}`).

## What lives here

- **Root module** (`main.tf`, `variables.tf`, `outputs.tf`, `versions.tf`)
  declares the provider, the S3 backend, and an example VPC.
- **`backend-bootstrap/`** is a one-shot module run with local state to
  create the S3 bucket and DynamoDB lock table before the root module is
  initialised.
- **`flake.nix`** + **`.envrc`** provide a hermetic dev shell pinning
  Terraform, the AWS CLI, tflint, terraform-docs, pre-commit, and just.
- **`.github/workflows/ci.yml`** runs `nix flake check`, `terraform fmt -check`,
  `terraform validate`, and `tflint` on every push and PR.

## Why a flake?

Every contributor and CI runner gets the same Terraform binary at the
same version. No `tfenv`, no "works on my machine", no surprise provider
upgrades. `nix develop` is the single entry point.

## Diagram

```
+----------+        +----------------------+         +------------+
| Dev /CI  | -----> | terraform (in flake) | ------> | AWS account |
+----------+        +----------------------+         +------------+
                              |
                              v
               +----------------------------+
               | S3 bucket (state)          |
               | DynamoDB table (lock)      |
               +----------------------------+
```

See [Development](development.md) for the day-to-day workflow.
