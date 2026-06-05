---
name: add-resource
description: Add a new AWS resource to this Terraform stack the right way.
---

# Skill: add an AWS resource

Use this whenever the user says "add an SQS queue", "create an IAM role",
"give me an S3 bucket for X", or anything similar.

Follow these steps **in order**. Do not skip the validation steps.

## 1. Decide where it lives

- A single resource or 2-3 tightly related ones -> add to the root module
  (a new file at the repo root, e.g. `sqs.tf`, `iam.tf`).
- A reusable cluster of resources -> create `modules/<name>/` with
  `main.tf`, `variables.tf`, `outputs.tf`, and a short `README.md`.
- Network plumbing (VPC, subnets, route tables, NAT) -> root, not a module.
- IAM policies that are obviously workload-specific -> beside the workload, not in a shared `iam/` module.

## 2. Look up the current provider docs

Read `versions.tf` first to get the pinned provider version. Then check
the docs for that exact version -- do not assume the latest argument shape
is available. Prefer the Context7 MCP server for this; fall back to the
HashiCorp registry.

## 3. Declare typed variables

Add every tunable knob as a `variable` in `variables.tf` (root) or the
module's `variables.tf`. Every variable needs:

- explicit `type`
- `description`
- a sensible `default` where one exists
- a `validation` block for constrained inputs (CIDRs, sizes, enums)

## 4. Write the resource

- Use `for_each` over a `map` or `set` for collections; reserve `count` for single optional resources.
- Reference IDs and ARNs through resource attributes -- never hard-code them.
- Do **not** add a `tags` block for tags that `default_tags` already supplies. Only add a per-resource `tags` for genuinely local ones (`Name`, `Role`).
- Mark sensitive variables and outputs with `sensitive = true`.
- No inline secrets. Source from AWS Secrets Manager, SSM Parameter Store, or env-fed variables.

## 5. Expose outputs

Add an `output` for anything a consumer might reference (ID, ARN, endpoint,
DNS name). Outputs are how modules compose.

## 6. Format, validate, lint

```sh
just fmt
just validate
just lint
```

Fix every warning. tflint runs the AWS ruleset; it will catch deprecated
arguments and bad instance types.

## 7. Plan and review

```sh
just plan
```

Read the plan output. Confirm:

- Number of resources to add / change / destroy matches expectations.
- No unexpected `-/+` (replace) operations on existing resources.
- IAM policies are minimal -- no `*` actions on `*` resources.
- Security groups are not opened to `0.0.0.0/0` unless the resource is explicitly public.

Present the plan to the user and wait for approval before `just apply`.

## 8. Update docs

- Regenerate per-module README sections: `just docs`.
- Update `docs/index.md` or `docs/development.md` if behaviour changed.
- Update `AGENTS.md` only if a new convention is being established.

## 9. Commit

Use Conventional Commits, scoped to the AWS service:

```
feat(sqs): add order-events queue with DLQ
fix(iam): tighten lambda execution policy
chore(deps): bump terraform-aws-modules/vpc to 5.13.0
```

## Anti-patterns to refuse

- "Just add `*` to the IAM policy for now." -> No.
- "Hard-code the AMI ID." -> Use a data source (`aws_ami` with `most_recent = true` and a strict `filter`).
- "Open port 22 to 0.0.0.0/0." -> Use SSM Session Manager.
- "Disable versioning on the S3 bucket to save money." -> No.
- "Use `local-exec` to call the AWS CLI." -> Find the proper resource or data source instead.
