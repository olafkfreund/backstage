# Skill: deploy-app

Add a new application to this cluster, end-to-end, without breaking it.

## When to use

The user wants to deploy a new workload to the `${{ values.clusterName }}`
cluster managed by this repo. They will say things like:

- "add a new app called X"
- "deploy service Y to the cluster"
- "create a new namespace for Z"

## Steps

### 1. Confirm cluster context

Never assume. Run:

```bash
kubectl config current-context
```

It MUST be `${{ values.clusterName }}`. If not, stop and ask the user to run
`just kubeconfig` or `kubectx ${{ values.clusterName }}`.

### 2. Scaffold under `apps/<name>/`

Copy the structure from `apps/example/`:

```
apps/<name>/
├── deployment.yaml
├── service.yaml
└── ingress.yaml         # optional, only if public
```

Rules:

- `metadata.name` matches the directory name.
- Always set resource requests + limits.
- Always set `securityContext` (`runAsNonRoot`, `readOnlyRootFilesystem`,
  drop `ALL` capabilities) unless the user has a real reason not to.
- Use the unprivileged variant of the base image if one exists.
- For Ingress: copy the annotations from `apps/example/ingress.yaml`. They
  wire up Traefik + cert-manager correctly.

### 3. Lint locally

```bash
kubectl apply --dry-run=client -f apps/<name>/
```

Fix any complaints before going further. For Helm-based apps:

```bash
helm template apps/<name>/ | kubectl apply --dry-run=client -f -
```

### 4. Real apply

```bash
kubectl create namespace <name> --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -n <name> -f apps/<name>/
```

### 5. Verify

```bash
kubectl -n <name> rollout status deployment/<name> --timeout=120s
kubectl -n <name> get pods,svc,ingress
stern -n <name> .
```

For ingresses, also check:

```bash
kubectl -n <name> describe ingress <name>
kubectl -n <name> get certificate     # cert-manager should issue
```

### 6. Commit + PR

Commit only the new `apps/<name>/` directory. The CI workflow already runs
`kubectl apply --dry-run=client` against everything under `apps/`, so a green
CI gives you confidence.

## Don't

- Don't put `Secret` manifests in git. Use external-secrets or sealed-secrets
  (see [`AGENTS.md`](../../AGENTS.md)).
- Don't create `LoadBalancer` services — use Ingress through Traefik.
- Don't disable resource limits to "unblock" pods. Diagnose first.
- Don't add cluster-wide CRDs from inside `apps/`. They belong in the baseline
  Helm chart.
