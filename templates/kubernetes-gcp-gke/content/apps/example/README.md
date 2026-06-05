# Example app

A minimal `hello-app` deployment that proves the platform works end to end:

- Runs in namespace `example`.
- Uses ServiceAccount `example-app`, annotated to bind to the Google ServiceAccount via Workload Identity.
- Exposed through Traefik via an `Ingress` with a cert-manager-managed TLS secret (`letsencrypt-staging` by default — switch to `letsencrypt-prod` when ready).

Apply with:

```bash
just deploy-example
```

Verify:

```bash
kubectl -n example get pods
kubectl -n example get svc,ingress
```

Update the `host` field in `ingress.yaml` to your actual DNS name, then point that DNS at the Traefik external LoadBalancer IP:

```bash
kubectl -n traefik get svc traefik
```
