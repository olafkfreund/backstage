# ${{ values.name }}

${{ values.description }}

This cluster is provisioned with Terraform and managed via a baseline Helm
chart. It targets **${{ values.awsRegion }}** with node type
**`${{ values.nodeInstanceType }}`**.

## Architecture at a glance

```
               ┌──────────────────────────────────┐
               │     AWS account / ${{ values.awsRegion }}     │
               │                                  │
               │   VPC (3 AZs, public + private)  │
               │       │                          │
               │       ▼                          │
               │   EKS control plane              │
               │       │                          │
               │       ▼                          │
               │   Managed node group             │
               │   (${{ values.nodeInstanceType }})              │
               └────────────┬─────────────────────┘
                            │
                ┌───────────▼───────────┐
                │ Traefik (ingress)     │
                │ cert-manager (TLS)    │
                │ example app (nginx)   │
                └───────────────────────┘
```

## What's installed

- **Traefik** as the cluster ingress controller (Helm dependency)
- **cert-manager** with a Let's Encrypt prod `ClusterIssuer`
- **example** namespace with an nginx Deployment exposed via Ingress

## Where to go next

- [Development](./development.md) — local toolchain, common commands
- [AGENTS.md](../AGENTS.md) — operational guardrails
- [`.claude/skills/deploy-app.md`](../.claude/skills/deploy-app.md) — how to add a new app
