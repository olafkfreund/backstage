variable "project_id" {
  description = "GCP project ID"
  type        = string
  default     = "${{ values.gcpProject }}"
}

variable "region" {
  description = "GCP region for the cluster"
  type        = string
  default     = "${{ values.gcpRegion }}"
}

variable "cluster_name" {
  description = "Name of the GKE cluster"
  type        = string
  default     = "${{ values.clusterName }}"
}

variable "gke_mode" {
  description = "Either 'autopilot' or 'standard'"
  type        = string
  default     = "${{ values.gkeMode }}"

  validation {
    condition     = contains(["autopilot", "standard"], var.gke_mode)
    error_message = "gke_mode must be either 'autopilot' or 'standard'."
  }
}

variable "release_channel" {
  description = "GKE release channel for the control plane"
  type        = string
  default     = "REGULAR"

  validation {
    condition     = contains(["RAPID", "REGULAR", "STABLE"], var.release_channel)
    error_message = "release_channel must be RAPID, REGULAR, or STABLE."
  }
}

variable "network_name" {
  description = "Name of the VPC network to create"
  type        = string
  default     = "${{ values.name }}-vpc"
}

variable "subnet_name" {
  description = "Name of the primary subnet"
  type        = string
  default     = "${{ values.name }}-subnet"
}

variable "subnet_cidr" {
  description = "Primary subnet CIDR (node IPs)"
  type        = string
  default     = "10.10.0.0/20"
}

variable "pods_range_name" {
  description = "Name of the secondary range for pods"
  type        = string
  default     = "pods"
}

variable "pods_cidr" {
  description = "Secondary range CIDR for pods"
  type        = string
  default     = "10.20.0.0/16"
}

variable "services_range_name" {
  description = "Name of the secondary range for services"
  type        = string
  default     = "services"
}

variable "services_cidr" {
  description = "Secondary range CIDR for services"
  type        = string
  default     = "10.30.0.0/20"
}

variable "master_ipv4_cidr" {
  description = "CIDR for the GKE master endpoint (private cluster)"
  type        = string
  default     = "172.16.0.0/28"
}

variable "standard_node_pool" {
  description = "Node pool spec used only when gke_mode = 'standard'"
  type = object({
    name           = string
    machine_type   = string
    disk_size_gb   = number
    disk_type      = string
    min_count      = number
    max_count      = number
    initial_count  = number
    preemptible    = bool
    auto_repair    = bool
    auto_upgrade   = bool
  })
  default = {
    name          = "default"
    machine_type  = "e2-standard-4"
    disk_size_gb  = 100
    disk_type     = "pd-standard"
    min_count     = 1
    max_count     = 5
    initial_count = 1
    preemptible   = false
    auto_repair   = true
    auto_upgrade  = true
  }
}

variable "example_namespace" {
  description = "Kubernetes namespace for the example workload"
  type        = string
  default     = "example"
}

variable "example_ksa" {
  description = "Kubernetes ServiceAccount name for the example workload"
  type        = string
  default     = "example-app"
}

variable "example_gsa_id" {
  description = "Google ServiceAccount account ID for the example workload"
  type        = string
  default     = "${{ values.name }}-example"
}

variable "labels" {
  description = "Labels applied to all eligible GCP resources"
  type        = map(string)
  default = {
    owner   = "olafkfreund"
    project = "${{ values.name }}"
    managed = "terraform"
  }
}
