output "resource_group_name" {
  description = "Resource group containing the cluster."
  value       = azurerm_resource_group.this.name
}

output "cluster_name" {
  description = "AKS cluster name."
  value       = azurerm_kubernetes_cluster.this.name
}

output "kube_config_command" {
  description = "Run this to merge kubeconfig locally."
  value       = "az aks get-credentials --resource-group ${azurerm_resource_group.this.name} --name ${azurerm_kubernetes_cluster.this.name} --overwrite-existing"
}

output "oidc_issuer_url" {
  description = "OIDC issuer URL — used to federate User-Assigned Managed Identities."
  value       = azurerm_kubernetes_cluster.this.oidc_issuer_url
}

output "workload_identity_client_id" {
  description = "Client ID of the user-assigned managed identity for example workloads."
  value       = azurerm_user_assigned_identity.workload.client_id
}

output "workload_identity_tenant_id" {
  description = "Tenant ID for workload identity federation."
  value       = azurerm_user_assigned_identity.workload.tenant_id
}
