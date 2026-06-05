# Development

## Toolchain

Everything you need is in the flake. Enter the shell with:

```bash
direnv allow      # one-time
# or
nix develop
```

Provides:

- `terraform`, `tflint`, `terraform-docs`
- `awscli2`, `aws-vault`
- `kubectl`, `kubernetes-helm`, `k9s`, `stern`, `kubectx`
- `just`

## Common tasks

```bash
just                       # list tasks
just plan                  # terraform plan
just apply                 # terraform apply
just kubeconfig            # wire kubectl to this cluster
just install-baseline      # helm install traefik + cert-manager + issuer
just deploy-example        # kubectl apply -f apps/example/
just destroy               # full teardown (careful!)
```

## Working with the cluster

```bash
kubectx                    # see / switch contexts (be deliberate!)
stern -n example .         # tail logs across pods
k9s                        # interactive UI
```

## Adding a new app

Follow [`.claude/skills/deploy-app.md`](../.claude/skills/deploy-app.md). TL;DR:

1. Add manifests under `apps/<name>/`
2. `helm template` or `kubectl apply --dry-run=client -f apps/<name>/` to lint
3. Real `kubectl apply -f apps/<name>/`
4. Verify with `kubectl -n <name> get pods,svc,ingress`

## Upgrading Terraform modules

We pin to the major (`~> 5.0`, `~> 20.0`). Bump them deliberately and run
`terraform plan` carefully — EKS module bumps often rotate node groups.

## Helm chart updates

```bash
cd charts/baseline
helm dependency update
helm lint .
helm template . | kubectl apply --dry-run=client -f -
```
