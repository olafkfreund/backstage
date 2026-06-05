variable "region" {
  description = "AWS region for the state bucket and lock table."
  type        = string
  default     = "${{ values.awsRegion }}"
}

variable "bucket_name" {
  description = "Globally unique S3 bucket name for Terraform state."
  type        = string
  default     = "${{ values.stateBucket }}"
}

variable "lock_table_name" {
  description = "DynamoDB table name used for Terraform state locking."
  type        = string
  default     = "${{ values.stateLockTable }}"
}
