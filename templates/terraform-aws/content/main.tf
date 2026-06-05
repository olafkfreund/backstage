# ------------------------------------------------------------------
# ${{ values.name }} -- ${{ values.description }}
#
# Root module. Owns the S3 remote-state backend and an example VPC so
# `terraform plan` produces a real change on day one. Replace or extend
# the VPC block with the resources this stack actually needs.
# ------------------------------------------------------------------

terraform {
  backend "s3" {
    bucket         = "${{ values.stateBucket }}"
    key            = "${{ values.name }}/terraform.tfstate"
    region         = "${{ values.awsRegion }}"
    dynamodb_table = "${{ values.stateLockTable }}"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = local.common_tags
  }
}

locals {
  common_tags = merge(
    {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
      Owner       = "${{ values.owner }}"
      Stack       = "${{ values.name }}"
    },
    var.additional_tags,
  )
}

# ------------------------------------------------------------------
# Example VPC. Delete this block once the real workload is wired up.
# ------------------------------------------------------------------
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "${var.project_name}-vpc"
  }
}
