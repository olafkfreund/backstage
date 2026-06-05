############################
# Providers
############################

provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

############################
# Networking
############################

module "vpc" {
  source  = "terraform-google-modules/network/google"
  version = "~> 9.3"

  project_id   = var.project_id
  network_name = var.network_name
  routing_mode = "REGIONAL"

  subnets = [
    {
      subnet_name           = var.subnet_name
      subnet_ip             = var.subnet_cidr
      subnet_region         = var.region
      subnet_private_access = "true"
      description           = "Primary subnet for ${var.cluster_name}"
    },
  ]

  secondary_ranges = {
    (var.subnet_name) = [
      {
        range_name    = var.pods_range_name
        ip_cidr_range = var.pods_cidr
      },
      {
        range_name    = var.services_range_name
        ip_cidr_range = var.services_cidr
      },
    ]
  }
}

############################
# GKE — Autopilot
############################

module "gke_autopilot" {
  count = var.gke_mode == "autopilot" ? 1 : 0

  source  = "terraform-google-modules/kubernetes-engine/google//modules/beta-autopilot-public-cluster"
  version = "~> 33.1"

  project_id        = var.project_id
  name              = var.cluster_name
  regional          = true
  region            = var.region
  network           = module.vpc.network_name
  subnetwork        = var.subnet_name
  ip_range_pods     = var.pods_range_name
  ip_range_services = var.services_range_name
  release_channel   = var.release_channel

  # VPC-native is the default for Autopilot; we make it explicit.
  networking_mode = "VPC_NATIVE"

  # Workload Identity is on by default in Autopilot. Workload pool is the project.
  cluster_resource_labels = var.labels

  depends_on = [module.vpc]
}

############################
# GKE — Standard
############################

module "gke_standard" {
  count = var.gke_mode == "standard" ? 1 : 0

  source  = "terraform-google-modules/kubernetes-engine/google"
  version = "~> 33.1"

  project_id        = var.project_id
  name              = var.cluster_name
  regional          = true
  region            = var.region
  network           = module.vpc.network_name
  subnetwork        = var.subnet_name
  ip_range_pods     = var.pods_range_name
  ip_range_services = var.services_range_name
  release_channel   = var.release_channel
  networking_mode   = "VPC_NATIVE"

  # Workload Identity
  identity_namespace = "${var.project_id}.svc.id.goog"

  # Stop using the default node pool — we declare our own below.
  remove_default_node_pool = true
  initial_node_count       = 1

  node_pools = [
    {
      name               = var.standard_node_pool.name
      machine_type       = var.standard_node_pool.machine_type
      min_count          = var.standard_node_pool.min_count
      max_count          = var.standard_node_pool.max_count
      initial_node_count = var.standard_node_pool.initial_count
      disk_size_gb       = var.standard_node_pool.disk_size_gb
      disk_type          = var.standard_node_pool.disk_type
      preemptible        = var.standard_node_pool.preemptible
      auto_repair        = var.standard_node_pool.auto_repair
      auto_upgrade       = var.standard_node_pool.auto_upgrade
      autoscaling        = true
    },
  ]

  node_pools_oauth_scopes = {
    all = [
      "https://www.googleapis.com/auth/cloud-platform",
    ]
  }

  cluster_resource_labels = var.labels

  depends_on = [module.vpc]
}

############################
# Workload Identity binding for the example app
############################

locals {
  workload_pool = "${var.project_id}.svc.id.goog"

  cluster_endpoint = coalesce(
    try(module.gke_autopilot[0].endpoint, null),
    try(module.gke_standard[0].endpoint, null),
  )

  cluster_ca_cert = coalesce(
    try(module.gke_autopilot[0].ca_certificate, null),
    try(module.gke_standard[0].ca_certificate, null),
  )

  cluster_name_effective = coalesce(
    try(module.gke_autopilot[0].name, null),
    try(module.gke_standard[0].name, null),
  )
}

resource "google_service_account" "example" {
  project      = var.project_id
  account_id   = var.example_gsa_id
  display_name = "Workload Identity GSA for ${var.cluster_name} example app"
}

# Minimal IAM: let the example workload read its own logs. Tighten as needed.
resource "google_project_iam_member" "example_logging" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.example.email}"
}

# Bind the Kubernetes SA to the GSA via Workload Identity.
resource "google_service_account_iam_member" "example_wi" {
  service_account_id = google_service_account.example.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${local.workload_pool}[${var.example_namespace}/${var.example_ksa}]"
}
