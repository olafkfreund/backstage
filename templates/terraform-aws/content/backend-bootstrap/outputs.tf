output "state_bucket" {
  description = "S3 bucket holding Terraform remote state."
  value       = aws_s3_bucket.tfstate.id
}

output "state_bucket_arn" {
  description = "ARN of the state bucket."
  value       = aws_s3_bucket.tfstate.arn
}

output "lock_table" {
  description = "DynamoDB table used for state locking."
  value       = aws_dynamodb_table.tflock.id
}

output "lock_table_arn" {
  description = "ARN of the lock table."
  value       = aws_dynamodb_table.tflock.arn
}
