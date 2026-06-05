variable "subscription_id" {
  type        = string
  description = "Azure subscription ID this stack deploys into."
  default     = "${{ values.azureSubscriptionId }}"
}

variable "location" {
  type        = string
  description = "Primary Azure region."
  default     = "${{ values.azureLocation }}"
}

variable "environment" {
  type        = string
  description = "Logical environment name (e.g. dev, staging, prod). Used in tags."
  default     = "dev"

  validation {
    condition     = contains(["dev", "test", "staging", "prod"], var.environment)
    error_message = "environment must be one of: dev, test, staging, prod."
  }
}

variable "owner" {
  type        = string
  description = "Team or individual that owns this stack. Used in tags."
  default     = "${{ values.owner }}"
}

variable "tags" {
  type        = map(string)
  description = "Extra tags to merge into every taggable resource."
  default     = {}
}

variable "vnet_address_space" {
  type        = list(string)
  description = "Address space for the example virtual network."
  default     = ["10.0.0.0/16"]
}

variable "default_subnet_prefixes" {
  type        = list(string)
  description = "Address prefixes for the default subnet."
  default     = ["10.0.1.0/24"]
}
