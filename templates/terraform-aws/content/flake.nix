{
  description = "${{ values.name }} -- Terraform on AWS dev shell";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    devenv.url = "github:cachix/devenv";
  };

  outputs = { self, nixpkgs, flake-utils, devenv, ... }@inputs:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
          config.allowUnfree = true;
        };
      in {
        devShells.default = devenv.lib.mkShell {
          inherit inputs pkgs;
          modules = [
            ({ pkgs, ... }: {
              name = "${{ values.name }}";

              packages = with pkgs; [
                terraform
                awscli2
                aws-vault
                tflint
                terraform-docs
                pre-commit
                just
                jq
                git
              ];

              env = {
                AWS_REGION = "${{ values.awsRegion }}";
                AWS_DEFAULT_REGION = "${{ values.awsRegion }}";
                TF_IN_AUTOMATION = "1";
                TF_INPUT = "0";
              };

              enterShell = ''
                echo "== ${{ values.name }} dev shell =="
                echo "terraform : $(terraform version | head -n1)"
                echo "aws cli   : $(aws --version 2>&1)"
                echo "tflint    : $(tflint --version | head -n1)"
                echo "region    : $AWS_REGION"
                echo
                if ! aws sts get-caller-identity >/dev/null 2>&1; then
                  echo "warning: no AWS credentials in scope. Use aws-vault, SSO, or env vars before running terraform."
                fi
              '';

              pre-commit.hooks = {
                terraform-format.enable = true;
                check-merge-conflicts.enable = true;
                check-yaml.enable = true;
                end-of-file-fixer.enable = true;
                trim-trailing-whitespace.enable = true;
              };
            })
          ];
        };

        checks.devShell = self.devShells.${system}.default;
      });
}
