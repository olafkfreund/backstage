output "resource_group_name" {
  description = "Resource group that holds the tfstate storage account."
  value       = azurerm_resource_group.tfstate.name
}

output "storage_account_name" {
  description = "Storage account that holds the tfstate container."
  value       = azurerm_storage_account.tfstate.name
}

output "container_name" {
  description = "Name of the blob container that holds tfstate files."
  value       = azurerm_storage_container.tfstate.name
}

output "backend_config_snippet" {
  description = "Drop this into the root stack's terraform { backend \"azurerm\" {} } block."
  value = <<-EOT
    resource_group_name  = "${azurerm_resource_group.tfstate.name}"
    storage_account_name = "${azurerm_storage_account.tfstate.name}"
    container_name       = "${azurerm_storage_container.tfstate.name}"
    key                  = "${{ values.name }}.tfstate"
  EOT
}
