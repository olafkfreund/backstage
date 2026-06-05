# ---------------------------------------------------------------------------
# Backend
#
# Uncomment and populate once a remote state storage account exists.
# Keeping it local makes the first `terraform apply` work out of the box.
#
# terraform {
#   backend "azurerm" {
#     resource_group_name  = "rg-tfstate"
#     storage_account_name = "sttfstate${{ values.name }}"
#     container_name       = "tfstate"
#     key                  = "${{ values.name }}/aks.tfstate"
#   }
# }
# ---------------------------------------------------------------------------

provider "azurerm" {
  subscription_id = var.subscription_id
  features {}
}

provider "kubernetes" {
  host                   = azurerm_kubernetes_cluster.this.kube_config[0].host
  client_certificate     = base64decode(azurerm_kubernetes_cluster.this.kube_config[0].client_certificate)
  client_key             = base64decode(azurerm_kubernetes_cluster.this.kube_config[0].client_key)
  cluster_ca_certificate = base64decode(azurerm_kubernetes_cluster.this.kube_config[0].cluster_ca_certificate)
}

resource "azurerm_resource_group" "this" {
  name     = var.resource_group_name
  location = var.location
  tags     = var.tags
}

resource "random_string" "dns_prefix" {
  length  = 6
  upper   = false
  special = false
  numeric = true
}

# ---------------------------------------------------------------------------
# AKS cluster
# ---------------------------------------------------------------------------
resource "azurerm_kubernetes_cluster" "this" {
  name                = var.cluster_name
  location            = azurerm_resource_group.this.location
  resource_group_name = azurerm_resource_group.this.name
  kubernetes_version  = var.kubernetes_version
  dns_prefix          = "${var.cluster_name}-${random_string.dns_prefix.result}"
  sku_tier            = "Standard"

  # Workload Identity — federated OIDC tokens, no client secrets.
  oidc_issuer_enabled       = true
  workload_identity_enabled = true
  azure_policy_enabled      = true
  local_account_disabled    = false

  automatic_channel_upgrade = "patch"

  default_node_pool {
    name                         = "system"
    vm_size                      = var.node_vm_size
    node_count                   = var.node_count
    only_critical_addons_enabled = true
    os_disk_type                 = "Ephemeral"
    type                         = "VirtualMachineScaleSets"
    max_pods                     = 110
    upgrade_settings {
      max_surge = "33%"
    }
  }

  identity {
    type = "SystemAssigned"
  }

  network_profile {
    network_plugin      = "azure"
    network_plugin_mode = "overlay"
    network_dataplane   = "cilium"
    network_policy      = "cilium"
    load_balancer_sku   = "standard"
    outbound_type       = "loadBalancer"
    pod_cidr            = "10.244.0.0/16"
    service_cidr        = "10.0.0.0/16"
    dns_service_ip      = "10.0.0.10"
  }

  role_based_access_control_enabled = true

  azure_active_directory_role_based_access_control {
    managed                = true
    azure_rbac_enabled     = true
    admin_group_object_ids = []
  }

  tags = var.tags
}

# ---------------------------------------------------------------------------
# User-assigned managed identity for example workloads.
# Federate it against the cluster's OIDC issuer for a given SA.
# ---------------------------------------------------------------------------
resource "azurerm_user_assigned_identity" "workload" {
  name                = "${var.cluster_name}-workload"
  location            = azurerm_resource_group.this.location
  resource_group_name = azurerm_resource_group.this.name
  tags                = var.tags
}

resource "azurerm_federated_identity_credential" "example" {
  name                = "example-app"
  resource_group_name = azurerm_resource_group.this.name
  parent_id           = azurerm_user_assigned_identity.workload.id
  audience            = ["api://AzureADTokenExchange"]
  issuer              = azurerm_kubernetes_cluster.this.oidc_issuer_url
  subject             = "system:serviceaccount:example:example-app"
}
