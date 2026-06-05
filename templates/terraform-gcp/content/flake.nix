{
  description = "${{ values.name }} — Terraform on GCP devShell (devenv)";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-parts.url = "github:hercules-ci/flake-parts";
    devenv = {
      url = "github:cachix/devenv";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = inputs @ { self, nixpkgs, flake-parts, devenv, ... }:
    flake-parts.lib.mkFlake { inherit inputs; } {
      systems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];

      imports = [
        devenv.flakeModule
      ];

      perSystem = { config, self', inputs', pkgs, system, lib, ... }: {
        devenv.shells.default = {
          name = "${{ values.name }}";

          # Cloud SDK + Terraform tooling.
          packages = with pkgs; [
            terraform
            tflint
            terraform-docs
            (google-cloud-sdk.withExtraComponents (with google-cloud-sdk.components; [
              gke-gcloud-auth-plugin
            ]))
            pre-commit
            just
            jq
            yq-go
            git
          ];

          env = {
            TF_IN_AUTOMATION = "1";
            CLOUDSDK_CORE_PROJECT = "${{ values.gcpProject }}";
            CLOUDSDK_COMPUTE_REGION = "${{ values.gcpRegion }}";
          };

          enterShell = ''
            echo "${{ values.name }} devShell"
            echo "  terraform: $(terraform version -json | jq -r .terraform_version)"
            echo "  gcloud:    $(gcloud --version | head -n1)"
            echo "  tflint:    $(tflint --version | head -n1)"
            echo ""
            echo "GCP project: ${{ values.gcpProject }}"
            echo "GCP region:  ${{ values.gcpRegion }}"
          '';
        };

        # `nix flake check` runs these.
        checks = {
          terraform-fmt = pkgs.runCommand "terraform-fmt-check" {
            nativeBuildInputs = [ pkgs.terraform ];
          } ''
            cp -r ${self} src
            chmod -R u+w src
            cd src
            terraform fmt -check -recursive -diff
            touch $out
          '';

          terraform-validate = pkgs.runCommand "terraform-validate" {
            nativeBuildInputs = [ pkgs.terraform ];
          } ''
            cp -r ${self} src
            chmod -R u+w src
            cd src
            export TF_IN_AUTOMATION=1
            export TF_PLUGIN_CACHE_DIR=$PWD/.terraform.d/plugin-cache
            mkdir -p "$TF_PLUGIN_CACHE_DIR"
            # Validate the root module without contacting the backend.
            terraform init -backend=false -input=false -no-color
            terraform validate -no-color
            # Validate the bootstrap module too.
            cd backend-bootstrap
            terraform init -backend=false -input=false -no-color
            terraform validate -no-color
            touch $out
          '';

          tflint = pkgs.runCommand "tflint-check" {
            nativeBuildInputs = [ pkgs.tflint ];
          } ''
            cp -r ${self} src
            chmod -R u+w src
            cd src
            tflint --init --no-color || true
            tflint --no-color --recursive
            touch $out
          '';
        };
      };
    };
}
