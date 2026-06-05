{
  description = "${{ values.name }} — AKS + Terraform + Helm dev environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-parts.url = "github:hercules-ci/flake-parts";
    devenv.url = "github:cachix/devenv";
  };

  outputs = inputs @ { flake-parts, ... }:
    flake-parts.lib.mkFlake { inherit inputs; } {
      imports = [ inputs.devenv.flakeModule ];
      systems = [ "x86_64-linux" "aarch64-linux" "aarch64-darwin" "x86_64-darwin" ];

      perSystem = { pkgs, ... }: {
        devenv.shells.default = {
          name = "${{ values.name }}";

          packages = with pkgs; [
            terraform
            tflint
            terraform-docs
            azure-cli
            kubernetes-helm
            kubectl
            k9s
            stern
            kubectx
            just
            jq
            yq-go
            git
          ];

          env = {
            ARM_SUBSCRIPTION_ID = "${{ values.azureSubscriptionId }}";
            TF_VAR_subscription_id = "${{ values.azureSubscriptionId }}";
            TF_VAR_location = "${{ values.azureLocation }}";
            TF_VAR_cluster_name = "${{ values.clusterName }}";
            TF_VAR_node_vm_size = "${{ values.nodeVmSize }}";
          };

          enterShell = ''
            echo ""
            echo "  ${{ values.name }} — AKS dev shell"
            echo "  region:      ${{ values.azureLocation }}"
            echo "  cluster:     ${{ values.clusterName }}"
            echo "  node size:   ${{ values.nodeVmSize }}"
            echo ""
            echo "  just plan | apply | kubeconfig | install-baseline | deploy-example | destroy"
            echo ""
          '';
        };
      };
    };
}
