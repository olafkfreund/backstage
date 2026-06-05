terraform {
  required_version = ">= 1.6.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.10"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 6.10"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.33"
    }
  }

  # ---- Remote state (recommended) -------------------------------------
  # 1. Create a versioned GCS bucket once:
  #      gsutil mb -p ${{ values.gcpProject }} -l ${{ values.gcpRegion }} -b on gs://${{ values.gcpProject }}-tfstate
  #      gsutil versioning set on gs://${{ values.gcpProject }}-tfstate
  # 2. Uncomment the block below.
  # 3. Run: just tf-init   (Terraform will migrate state on first run)
  #
  # backend "gcs" {
  #   bucket = "${{ values.gcpProject }}-tfstate"
  #   prefix = "${{ values.name }}/${{ values.clusterName }}"
  # }
}
