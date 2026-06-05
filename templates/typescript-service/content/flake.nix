{
  description = "${{ values.description }}";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
        nodejs = pkgs.nodejs_22;
        pnpm = pkgs.pnpm.override { inherit nodejs; };
      in {
        devShells.default = pkgs.mkShell {
          packages = [
            nodejs
            pnpm
            pkgs.nodePackages.typescript-language-server
          ];
          shellHook = ''
            export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
            echo "▲ ${{ values.name }} dev shell"
            echo "  node: $(node --version)"
            echo "  pnpm: $(pnpm --version)"
          '';
          NODE_ENV = "development";
          LOG_LEVEL = "debug";
          PORT = "${{ values.listenPort }}";
        };
      });
}
