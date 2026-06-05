variable "subscription_id" {
  description = "Azure subscription ID hosting the cluster."
  type        = string
  default     = "${{ values.azureSubscriptionId }}"
  validation {
    condition     = can(regex("^[0-9a-fA-F-]{36}$", var.subscription_id))
    error_message = "subscription_id must be a valid GUID."
  }
}

variable "location" {
  description = "Azure region for the resource group and cluster."
  type        = string
  default     = "${{ values.azureLocation }}"
}

variable "resource_group_name" {
  description = "Resource group name. Defaults to rg-<project>."
  type        = string
  default     = "rg-${{ values.name }}"
}

variable "cluster_name" {
  description = "AKS cluster name."
  type        = string
  default     = "${{ values.clusterName }}"
}

variable "kubernetes_version" {
  description = "Kubernetes minor version (AKS supported)."
  type        = string
  default     = "1.31"
}

variable "node_count" {
  description = "Default node pool size."
  type        = number
  default     = 2
  validation {
    condition     = var.node_count >= 1 && var.node_count <= 50
    error_message = "node_count must be between 1 and 50."
  }
}

variable "node_vm_size" {
  description = "VM size for the default node pool."
  type        = string
  default     = "${{ values.nodeVmSize }}"
}

variable "tags" {
  description = "Tags applied to every resource."
  type        = map(string)
  default = {
    project     = "${{ values.name }}"
    owner       = "${{ values.owner }}"
    managed-by  = "terraform"
    environment = "production"
  }
}
