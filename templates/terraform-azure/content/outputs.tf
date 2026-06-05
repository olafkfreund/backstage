output "resource_group_name" {
  description = "Name of the primary resource group created by this stack."
  value       = azurerm_resource_group.main.name
}

output "resource_group_id" {
  description = "Azure resource ID of the primary resource group."
  value       = azurerm_resource_group.main.id
}

output "location" {
  description = "Azure region the stack deployed into."
  value       = azurerm_resource_group.main.location
}

output "virtual_network_id" {
  description = "Resource ID of the example virtual network."
  value       = azurerm_virtual_network.main.id
}

output "default_subnet_id" {
  description = "Resource ID of the default subnet."
  value       = azurerm_subnet.default.id
}
