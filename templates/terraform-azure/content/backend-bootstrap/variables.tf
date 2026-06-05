variable "location" {
  type        = string
  description = "Azure region for the state resource group and storage account."
  default     = "${{ values.azureLocation }}"
}

variable "resource_group_name" {
  type        = string
  description = "Name of the resource group that holds the tfstate storage account."
  default     = "${{ values.stateRG }}"
}

variable "storage_account_name" {
  type        = string
  description = "Globally unique storage account name for tfstate (3-24 lowercase alphanumeric chars)."
  default     = "${{ values.stateStorageAccount }}"

  validation {
    condition     = can(regex("^[a-z0-9]{3,24}$", var.storage_account_name))
    error_message = "storage_account_name must be 3-24 lowercase alphanumeric characters."
  }
}
