---
name: deploy-app
description: Deploy or update a workload on the ${{ values.name }} GKE cluster, with Workload Identity wired in.
---

# Skill: deploy-app

Use this skill when the user asks to deploy a new app, update an existing app, or wire up Workload Identity for a workload on the `${{ values.clusterName }}` cluster.

## Inputs you should collect

- **App name** (lower-case, dash-separated).
- **Container image** (fully qualified, pinned by digest if production).
- **Listening port** inside the container.
- **External hostname** (DNS record the user controls).
- **GCP IAM roles** the app actually needs (least privilege!).
- **Replicas** (default 2).

## Steps

1. **Pick a namespace.** Default: same as app name. Create with:

   ```bash
   kubectl create namespace <ns> --dry-run=client -o yaml | kubectl apply -f -
   ```

2. **Create a Google ServiceAccount** for the app, in Terraform under `infra/main.tf`. Pattern after the `example` block:

   ```hcl
   resource "google_service_account" "<app>" {
     project      = var.project_id
     account_id   = "${{ values.name }}-<app>"
     display_name = "WI GSA for <app>"
   }

   resource "google_service_account_iam_member" "<app>_wi" {
     service_account_id = google_service_account.<app>.name
     role               = "roles/iam.workloadIdentityUser"
     member             = "serviceAccount:${var.project_id}.svc.id.goog[<ns>/<ksa>]"
   }
   ```

3. **Grant the GSA exactly what it needs** with `google_project_iam_member` resources. Never grant `roles/owner` or `roles/editor`.

4. **Apply Terraform.**

   ```bash
   just tf-plan
   just tf-apply
   ```

5. **Create the Kubernetes ServiceAccount** annotated with the GSA email:

   ```yaml
   apiVersion: v1
   kind: ServiceAccount
   metadata:
     name: <ksa>
     namespace: <ns>
     annotations:
       iam.gke.io/gcp-service-account: ${{ values.name }}-<app>@${{ values.gcpProject }}.iam.gserviceaccount.com
   ```

6. **Write the Deployment.** Required hygiene:
   - `securityContext.runAsNonRoot: true`
   - `allowPrivilegeEscalation: false`
   - `readOnlyRootFilesystem: true`
   - `capabilities.drop: [ALL]`
   - resource requests AND limits
   - readiness + liveness probes
   - `serviceAccountName: <ksa>`

7. **Add a Service** (ClusterIP) and an **Ingress** using `ingressClassName: traefik` and `cert-manager.io/cluster-issuer: letsencrypt-staging` (flip to `letsencrypt-prod` once it's working).

8. **Dry-run first.**

   ```bash
   kubectl apply --dry-run=client -f apps/<app>/
   kubectl apply --dry-run=server -f apps/<app>/
   ```

9. **Apply, then verify.**

   ```bash
   kubectl apply -f apps/<app>/
   kubectl -n <ns> rollout status deploy/<app>
   kubectl -n <ns> get pods,svc,ingress
   ```

10. **Test Workload Identity end-to-end** from inside a pod:

    ```bash
    kubectl -n <ns> exec -it deploy/<app> -- \
      curl -s -H "Metadata-Flavor: Google" \
      http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/email
    ```

    Expect the GSA email back.

## What to refuse

- Creating a workload that requests `hostNetwork`, `hostPID`, or privileged containers on **Autopilot** — Autopilot will reject it. Offer the Standard-mode tradeoff explicitly.
- Embedding a JSON service-account key into a Secret. Use Workload Identity instead.
- Pinning images by `:latest` in production manifests.
- Granting `roles/owner` or `roles/editor` to a workload GSA.

## Quick reference

- Cluster: `${{ values.clusterName }}` (`${{ values.gkeMode }}`)
- Project: `${{ values.gcpProject }}`
- Region: `${{ values.gcpRegion }}`
- Workload pool: `${{ values.gcpProject }}.svc.id.goog`
