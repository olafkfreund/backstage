# Development

## 1. Enter the dev shell

With direnv:

```sh
direnv allow
```

Without direnv:

```sh
nix develop
```

Verify:

```sh
terraform version    # >= 1.9.0
aws --version
tflint --version
```

## 2. Provide AWS credentials

The shell does not ship credentials. Pick one:

- **aws-vault** (recommended for laptops): `aws-vault exec myprofile -- terraform plan`
- **AWS SSO**: `aws sso login --profile myprofile && export AWS_PROFILE=myprofile`
- **Env vars**: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN`
- **CI**: OIDC via `aws-actions/configure-aws-credentials` (see `ci.yml`).

Confirm:

```sh
aws sts get-caller-identity
```

## 3. Bootstrap the remote state (once per account/region)

```sh
cd backend-bootstrap
terraform init
terraform apply \
  -var="bucket_name=${{ values.stateBucket }}" \
  -var="lock_table_name=${{ values.stateLockTable }}" \
  -var="region=${{ values.awsRegion }}"
cd ..
git add backend-bootstrap/terraform.tfstate
git commit -m "bootstrap: create remote state backend"
```

## 4. Initialise and plan the root module

```sh
just init        # terraform init against the S3 backend
just validate    # terraform validate
just lint        # tflint --recursive
just plan        # produces tfplan
just apply       # applies tfplan
```

Or run all the static checks at once:

```sh
just ci
```

## 5. Add a resource

1. Open or create a file in the root module (or a sub-module under `modules/`).
2. Declare the resource with explicit, **typed** inputs and outputs.
3. Run `just fmt && just validate && just lint`.
4. Run `just plan` and review the diff carefully.
5. Commit with a Conventional Commits message: `feat(vpc): add private subnets`.

See `.claude/skills/add-resource.md` for the agent-friendly version of this checklist.

## 6. Tagging

The `aws` provider has `default_tags` configured in `main.tf`. Every taggable
resource picks up `Project`, `Environment`, `ManagedBy`, `Owner`, and `Stack`
automatically. Add to `var.additional_tags` for global extras, or to a
resource's own `tags` block for resource-local ones.

## 7. Drift handling

```sh
terraform plan -refresh-only      # shows drift between AWS and state
terraform apply -refresh-only     # accepts drift INTO state (read carefully)
```

Never fix drift by editing the state file. Re-import or re-apply.

## 8. Destroying

```sh
just destroy
```

The `backend-bootstrap` resources are intentionally **not** destroyed by
the root module. Tear them down manually only when the entire account is
going away.
