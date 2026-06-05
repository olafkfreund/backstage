output "network_id" {
  description = "Fully-qualified ID of the primary VPC network."
  value       = google_compute_network.primary.id
}

output "network_self_link" {
  description = "Self-link of the primary VPC network."
  value       = google_compute_network.primary.self_link
}

output "subnet_id" {
  description = "Fully-qualified ID of the primary subnetwork."
  value       = google_compute_subnetwork.primary.id
}

output "project_id" {
  description = "Effective GCP project ID."
  value       = var.project_id
}

output "region" {
  description = "Effective default region."
  value       = var.region
}
