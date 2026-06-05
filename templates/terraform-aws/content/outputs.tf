output "vpc_id" {
  description = "ID of the example VPC."
  value       = aws_vpc.main.id
}

output "vpc_cidr" {
  description = "CIDR block of the example VPC."
  value       = aws_vpc.main.cidr_block
}

output "aws_region" {
  description = "AWS region this stack deployed into."
  value       = var.aws_region
}

output "state_bucket" {
  description = "S3 bucket holding the Terraform state for this stack."
  value       = "${{ values.stateBucket }}"
}

output "state_lock_table" {
  description = "DynamoDB table used for Terraform state locking."
  value       = "${{ values.stateLockTable }}"
}
