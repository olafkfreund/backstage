variable "aws_region" {
  description = "AWS region for the EKS cluster"
  type        = string
  default     = "${{ values.awsRegion }}"
}

variable "cluster_name" {
  description = "EKS cluster name"
  type        = string
  default     = "${{ values.clusterName }}"
}

variable "cluster_version" {
  description = "EKS Kubernetes version"
  type        = string
  default     = "1.30"
}

variable "node_instance_type" {
  description = "EC2 instance type for the managed node group"
  type        = string
  default     = "${{ values.nodeInstanceType }}"
}

variable "node_group_min_size" {
  description = "Minimum nodes in the managed node group"
  type        = number
  default     = 2
}

variable "node_group_max_size" {
  description = "Maximum nodes in the managed node group"
  type        = number
  default     = 5
}

variable "node_group_desired_size" {
  description = "Desired nodes in the managed node group"
  type        = number
  default     = 2
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "tags" {
  description = "Tags applied to all resources"
  type        = map(string)
  default = {
    Project   = "${{ values.name }}"
    ManagedBy = "terraform"
    Template  = "kubernetes-aws-eks"
  }
}
