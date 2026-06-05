terraform {
  backend "azurerm" {
    resource_group_name  = "${{ values.stateRG }}"
    storage_account_name = "${{ values.stateStorageAccount }}"
    container_name       = "tfstate"
    key                  = "${{ values.name }}.tfstate"
  }
}

provider "azurerm" {
  features {}
  subscription_id = var.subscription_id
}

locals {
  base_name = "${{ values.name }}"

  default_tags = {
    managed_by  = "terraform"
    stack       = local.base_name
    environment = var.environment
    owner       = var.owner
  }

  tags = merge(local.default_tags, var.tags)
}

resource "azurerm_resource_group" "main" {
  name     = "${local.base_name}-rg"
  location = var.location
  tags     = local.tags
}

resource "azurerm_virtual_network" "main" {
  name                = "${local.base_name}-vnet"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  address_space       = var.vnet_address_space
  tags                = local.tags
}

resource "azurerm_subnet" "default" {
  name                 = "default"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = var.default_subnet_prefixes
}
