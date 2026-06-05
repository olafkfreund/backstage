variable "project_name" {
  description = "Short identifier used in resource names and the Project tag."
  type        = string
  default     = "${{ values.name }}"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{2,38}[a-z0-9]$", var.project_name))
    error_message = "project_name must be 4-40 chars, lowercase letters, digits, and hyphens."
  }
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod, ...)."
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "prod", "sandbox", "qa"], var.environment)
    error_message = "environment must be one of: dev, staging, prod, sandbox, qa."
  }
}

variable "aws_region" {
  description = "AWS region the provider operates in. Must match the backend region."
  type        = string
  default     = "${{ values.awsRegion }}"
}

variable "vpc_cidr" {
  description = "CIDR block for the example VPC."
  type        = string
  default     = "10.0.0.0/16"

  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0))
    error_message = "vpc_cidr must be a valid IPv4 CIDR block."
  }
}

variable "additional_tags" {
  description = "Extra tags merged into every taggable resource via the provider default_tags."
  type        = map(string)
  default     = {}
}
