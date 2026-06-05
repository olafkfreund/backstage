# ${{ values.name }} — primary Terraform configuration.
#
# Provider and backend versions are pinned in versions.tf.
# State lives in the GCS bucket created by backend-bootstrap/.

terraform {
  backend "gcs" {
    bucket = "${{ values.stateBucket }}"
    prefix = "${{ values.name }}/state"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

locals {
  default_labels = {
    managed_by = "terraform"
    component  = "${{ values.name }}"
    owner      = replace("${{ values.owner }}", ":", "_")
  }
}

resource "google_compute_network" "primary" {
  name                    = "${{ values.name }}-vpc"
  description             = "Primary VPC for ${{ values.name }}"
  auto_create_subnetworks = false
  routing_mode            = "REGIONAL"
}

resource "google_compute_subnetwork" "primary" {
  name                     = "${{ values.name }}-subnet-${var.region}"
  ip_cidr_range            = var.subnet_cidr
  region                   = var.region
  network                  = google_compute_network.primary.id
  private_ip_google_access = true

  log_config {
    aggregation_interval = "INTERVAL_10_MIN"
    flow_sampling        = 0.5
    metadata             = "INCLUDE_ALL_METADATA"
  }
}
