# Development

## Entering the dev shell

```bash
nix develop          # one-shot
direnv allow         # persistent via .envrc
```

You now have: `terraform`, `az`, `kubectl`, `helm`, `k9s`, `stern`, `kubectx`, `just`,
`tflint`, `terraform-docs`.

## Common loops

### Terraform

```bash
cd infra
terraform fmt -recursive
terraform validate
tflint --init && tflint
just plan
```

### Helm baseline

```bash
helm dependency update charts/baseline
helm lint charts/baseline
helm template charts/baseline | kubectl apply --dry-run=client -f -
```

### Watching workloads

```bash
k9s                                  # TUI
stern -n example example-app         # multi-pod logs
kubectx ${{ values.clusterName }}    # context switch
```

## Workload Identity dev loop

1. Create a User-Assigned Managed Identity in Azure.
2. Federate it against the AKS OIDC issuer for `system:serviceaccount:example:example-app`.
3. Annotate the SA (see `apps/example/serviceaccount.yaml`) with the MI's client-id.
4. Add `azure.workload.identity/use: "true"` to the pod template.

```bash
CLIENT_ID=$(az identity show -g rg-${{ values.name }} -n ${{ values.name }}-wi --query clientId -o tsv)
OIDC_ISSUER=$(terraform -chdir=infra output -raw oidc_issuer_url)

az identity federated-credential create \
  --name example-app \
  --identity-name ${{ values.name }}-wi \
  --resource-group rg-${{ values.name }} \
  --issuer "$OIDC_ISSUER" \
  --subject system:serviceaccount:example:example-app
```

## CI

GitHub Actions runs on every PR:

- `terraform fmt -check -recursive`
- `terraform validate`
- `helm lint charts/baseline`
- `kubectl --dry-run=client` on `apps/example/`
