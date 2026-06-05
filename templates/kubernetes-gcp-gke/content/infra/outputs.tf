output "cluster_name" {
  description = "Name of the GKE cluster"
  value       = local.cluster_name_effective
}

output "cluster_endpoint" {
  description = "GKE control-plane endpoint"
  value       = local.cluster_endpoint
  sensitive   = true
}

output "cluster_ca_certificate" {
  description = "Base64-encoded cluster CA certificate"
  value       = local.cluster_ca_cert
  sensitive   = true
}

output "region" {
  description = "GCP region for the cluster"
  value       = var.region
}

output "project_id" {
  description = "GCP project ID"
  value       = var.project_id
}

output "workload_pool" {
  description = "Workload Identity pool for the cluster"
  value       = local.workload_pool
}

output "get_credentials_command" {
  description = "gcloud command to populate kubeconfig"
  value       = "gcloud container clusters get-credentials ${local.cluster_name_effective} --region=${var.region} --project=${var.project_id}"
}

output "example_gsa_email" {
  description = "GSA email for the example workload (bind via KSA annotation iam.gke.io/gcp-service-account)"
  value       = google_service_account.example.email
}

output "example_namespace" {
  description = "Kubernetes namespace for the example workload"
  value       = var.example_namespace
}

output "example_ksa" {
  description = "Kubernetes ServiceAccount name for the example workload"
  value       = var.example_ksa
}
