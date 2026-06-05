# Baseline chart

Umbrella chart that installs:

- [`traefik`](https://github.com/traefik/traefik-helm-chart) — ingress controller, exposes a GCP external LoadBalancer.
- [`cert-manager`](https://github.com/cert-manager/cert-manager) — automatic TLS via Let's Encrypt.

Two `ClusterIssuer` resources are also created (`letsencrypt-staging`, `letsencrypt-prod`). Reference them from `Certificate` resources or via `cert-manager.io/cluster-issuer` annotations on `Ingress` objects.

## Install

```bash
helm dependency update charts/baseline
helm upgrade --install baseline charts/baseline \
  --namespace baseline-system --create-namespace \
  --wait --timeout 10m
```

Or just:

```bash
just helm-baseline
```
