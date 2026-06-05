{
  description = "${{ values.name }} - Terraform on Azure dev shell (devenv)";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    systems.url = "github:nix-systems/default";
    devenv = {
      url = "github:cachix/devenv";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  nixConfig = {
    extra-trusted-public-keys = [
      "devenv.cachix.org-1:w1cLUi8dv3hnoSPGAuibQv+f9TZLr6cv/Hm9XgU50cw="
    ];
    extra-substituters = [
      "https://devenv.cachix.org"
    ];
  };

  outputs =
    {
      self,
      nixpkgs,
      systems,
      devenv,
      ...
    }@inputs:
    let
      forEachSystem = nixpkgs.lib.genAttrs (import systems);
      pkgsFor = system: import nixpkgs { inherit system; config.allowUnfree = true; };
    in
    {
      devShells = forEachSystem (
        system:
        let
          pkgs = pkgsFor system;
        in
        {
          default = devenv.lib.mkShell {
            inherit inputs pkgs;
            modules = [
              {
                packages = with pkgs; [
                  terraform
                  azure-cli
                  tflint
                  terraform-docs
                  pre-commit
                  just
                  jq
                  git
                ];

                env = {
                  ARM_SUBSCRIPTION_ID = "${{ values.azureSubscriptionId }}";
                  TF_IN_AUTOMATION = "0";
                  CHECKPOINT_DISABLE = "1";
                };

                enterShell = ''
                  echo "${{ values.name }} dev shell ready"
                  echo "  terraform : $(terraform version | head -n1)"
                  echo "  az        : $(az version --query '\"azure-cli\"' -o tsv 2>/dev/null || echo 'unknown')"
                  echo "  tflint    : $(tflint --version | head -n1)"
                  echo ""
                  echo "Subscription: $ARM_SUBSCRIPTION_ID"
                  echo "Region      : ${{ values.azureLocation }}"
                  echo ""
                  echo "Next steps:"
                  echo "  az login"
                  echo "  (cd backend-bootstrap && terraform init && terraform apply)"
                  echo "  terraform init && terraform plan"
                '';
              }
            ];
          };
        }
      );

      checks = forEachSystem (
        system:
        let
          pkgs = pkgsFor system;
        in
        {
          terraform-fmt = pkgs.runCommand "terraform-fmt-check" { buildInputs = [ pkgs.terraform ]; } ''
            cp -r ${self}/. ./src
            chmod -R u+w ./src
            cd ./src
            terraform fmt -check -recursive
            touch $out
          '';
        }
      );

      formatter = forEachSystem (system: (pkgsFor system).nixfmt-rfc-style);
    };
}
