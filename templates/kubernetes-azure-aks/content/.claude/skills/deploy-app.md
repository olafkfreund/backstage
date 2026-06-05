# Skill: deploy-app

Deploy a new workload onto the `${{ values.clusterName }}` AKS cluster with
Workload Identity, Traefik ingress, and cert-manager TLS.

## When to use

- Adding a new microservice to this cluster.
- Wiring an existing app to Azure resources (Storage, Key Vault, Service Bus) via
  Workload Identity.

## Procedure

1. **Pick a namespace and ServiceAccount name** (e.g. `myapp` / `myapp`).
2. **Create a User-Assigned Managed Identity** in `rg-${{ values.name }}`:
   ```bash
   az identity create -g rg-${{ values.name }} -n myapp-wi -l ${{ values.azureLocation }}
   ```
3. **Federate it** against the cluster's OIDC issuer:
   ```bash
   OIDC=$(terraform -chdir=infra output -raw oidc_issuer_url)
   az identity federated-credential create \
     --name myapp \
     --identity-name myapp-wi \
     --resource-group rg-${{ values.name }} \
     --issuer "$OIDC" \
     --subject system:serviceaccount:myapp:myapp
   ```
4. **Grant Azure RBAC** at the resource scope (e.g. Key Vault Secrets User).
5. **Create the namespace + manifests**, copying `apps/example/` as a starting point.
   - Annotate the ServiceAccount with the `clientId` of `myapp-wi`.
   - Label pods with `azure.workload.identity/use: "true"`.
6. **Add an Ingress** (Traefik). For TLS, set the
   `cert-manager.io/cluster-issuer: letsencrypt-prod` annotation and a `tls:` block.
7. **Dry-run + apply**:
   ```bash
   kubectl apply --dry-run=client -f apps/myapp/ --recursive
   kubectl apply -f apps/myapp/ --recursive
   ```
8. **Verify**:
   ```bash
   kubectl -n myapp get pods,svc,ingress
   stern -n myapp myapp
   ```

## Hard rules

- No `imagePullSecrets` for ACR — use the attached kubelet identity.
- No `cluster-admin` bindings for workloads.
- No secrets committed to git — use Key Vault + CSI driver.
- Every workload gets its own ServiceAccount + Managed Identity. No sharing.
