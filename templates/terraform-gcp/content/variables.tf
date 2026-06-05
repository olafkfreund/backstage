variable "project_id" {
  description = "GCP project ID this configuration targets."
  type        = string
  default     = "${{ values.gcpProject }}"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{4,28}[a-z0-9]$", var.project_id))
    error_message = "project_id must be a valid GCP project ID (6-30 chars, lowercase letters/digits/hyphens)."
  }
}

variable "region" {
  description = "Default region for regional resources."
  type        = string
  default     = "${{ values.gcpRegion }}"
}

variable "subnet_cidr" {
  description = "Primary subnet CIDR range (RFC1918)."
  type        = string
  default     = "10.10.0.0/20"

  validation {
    condition     = can(cidrnetmask(var.subnet_cidr))
    error_message = "subnet_cidr must be a valid CIDR block."
  }
}
