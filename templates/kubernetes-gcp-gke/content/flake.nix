{
  description = "${{ values.name }} — GKE platform dev shell";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-parts.url = "github:hercules-ci/flake-parts";
    devenv.url = "github:cachix/devenv";
    systems.url = "github:nix-systems/default";
  };

  outputs = inputs @ { flake-parts, systems, ... }:
    flake-parts.lib.mkFlake { inherit inputs; } {
      systems = import systems;

      imports = [
        inputs.devenv.flakeModule
      ];

      perSystem = { config, self', inputs', pkgs, system, ... }: {
        devenv.shells.default = {
          name = "${{ values.name }}";

          packages = with pkgs; [
            # Terraform
            terraform
            tflint
            terraform-docs

            # Google Cloud SDK
            google-cloud-sdk

            # Kubernetes tooling
            kubectl
            kubernetes-helm
            kubectx
            k9s
            stern
            kube-linter

            # Task runner
            just

            # General-purpose CLI helpers
            jq
            yq-go
            git
            gnumake
            curl
            coreutils
            findutils
            gnused
            gnugrep

            # Pre-commit
            pre-commit
          ];

          env = {
            GCP_PROJECT = "${{ values.gcpProject }}";
            GCP_REGION = "${{ values.gcpRegion }}";
            CLUSTER_NAME = "${{ values.clusterName }}";
            GKE_MODE = "${{ values.gkeMode }}";
            CLOUDSDK_CORE_PROJECT = "${{ values.gcpProject }}";
            CLOUDSDK_COMPUTE_REGION = "${{ values.gcpRegion }}";
            TF_IN_AUTOMATION = "1";
          };

          enterShell = ''
            echo ""
            echo "  ${{ values.name }} dev shell"
            echo "  project:  ${{ values.gcpProject }}"
            echo "  region:   ${{ values.gcpRegion }}"
            echo "  cluster:  ${{ values.clusterName }} (${{ values.gkeMode }})"
            echo ""
            echo "  run 'just --list' to see available tasks"
            echo ""
          '';

          # devenv-managed pre-commit hooks for the repo
          pre-commit.hooks = {
            nixpkgs-fmt.enable = true;
            terraform-format.enable = true;
            check-yaml.enable = true;
            check-merge-conflicts.enable = true;
            end-of-file-fixer.enable = true;
            trim-trailing-whitespace.enable = true;
          };
        };
      };
    };
}
