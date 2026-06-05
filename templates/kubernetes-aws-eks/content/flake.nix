{
  description = "${{ values.name }} — AWS EKS dev toolchain";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-parts.url = "github:hercules-ci/flake-parts";
    devenv = {
      url = "github:cachix/devenv";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = inputs @ { flake-parts, ... }:
    flake-parts.lib.mkFlake { inherit inputs; } {
      imports = [ inputs.devenv.flakeModule ];

      systems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];

      perSystem = { config, pkgs, ... }: {
        devenv.shells.default = {
          name = "${{ values.name }}";

          packages = with pkgs; [
            # Terraform
            terraform
            tflint
            terraform-docs

            # AWS
            awscli2
            aws-vault

            # Kubernetes
            kubectl
            kubernetes-helm
            k9s
            stern
            kubectx

            # Task runner
            just

            # Misc
            jq
            yq-go
            git
          ];

          env = {
            AWS_REGION = "${{ values.awsRegion }}";
            TF_VAR_aws_region = "${{ values.awsRegion }}";
            TF_VAR_cluster_name = "${{ values.clusterName }}";
            TF_VAR_node_instance_type = "${{ values.nodeInstanceType }}";
          };

          enterShell = ''
            echo "== ${{ values.name }} =="
            echo "cluster:  ${{ values.clusterName }}"
            echo "region:   ${{ values.awsRegion }}"
            echo "nodes:    ${{ values.nodeInstanceType }}"
            echo
            echo "Run 'just' to see available tasks."
          '';
        };
      };
    };
}
