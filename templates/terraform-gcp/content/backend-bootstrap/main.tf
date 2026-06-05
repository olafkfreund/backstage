# One-time bootstrap: create the GCS bucket that holds remote Terraform state
# for the main configuration. This module is intentionally minimal and uses a
# local state file so it has no chicken-and-egg dependency on itself.
#
# After applying, you may optionally migrate this module's state into the same
# bucket under a distinct prefix.

terraform {
  required_version = ">= 1.9.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

resource "google_storage_bucket" "tfstate" {
  name     = var.bucket_name
  location = var.region
  project  = var.project_id

  storage_class               = "STANDARD"
  force_destroy               = false
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  versioning {
    enabled = true
  }

  lifecycle_rule {
    condition {
      num_newer_versions = 10
    }
    action {
      type = "Delete"
    }
  }

  lifecycle_rule {
    condition {
      age        = 30
      with_state = "ARCHIVED"
    }
    action {
      type = "Delete"
    }
  }

  labels = {
    managed_by = "terraform"
    purpose    = "tfstate"
    component  = "${{ values.name }}"
  }
}

variable "project_id" {
  description = "GCP project that will own the state bucket."
  type        = string
  default     = "${{ values.gcpProject }}"
}

variable "region" {
  description = "Location for the state bucket. Regional buckets are recommended for cost; switch to a multi-region (e.g. US, EU) if you need higher availability."
  type        = string
  default     = "${{ values.gcpRegion }}"
}

variable "bucket_name" {
  description = "Globally-unique GCS bucket name for Terraform state."
  type        = string
  default     = "${{ values.stateBucket }}"
}

output "bucket_name" {
  description = "Name of the state bucket."
  value       = google_storage_bucket.tfstate.name
}

output "bucket_url" {
  description = "gs:// URL of the state bucket."
  value       = google_storage_bucket.tfstate.url
}
