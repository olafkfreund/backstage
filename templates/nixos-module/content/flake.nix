{
  description = "${{ values.description }}";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    let
      # The module — exposed as a flake-level output so any consumer flake
      # can do `imports = [ inputs.${{ values.name }}.nixosModules.${{ values.name }} ];`
      ${{ values.name }}Module = import ./module.nix;
    in
    {
      nixosModules.${{ values.name }} = ${{ values.name }}Module;
      nixosModules.default = ${{ values.name }}Module;
    }
    //
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
      in
      {
        devShells.default = pkgs.mkShell {
          packages = [
            pkgs.nix
            pkgs.nixpkgs-fmt
            pkgs.statix
            pkgs.deadnix
            pkgs.nil # LSP
          ];
          shellHook = ''
            echo "${{ values.name }} dev shell"
            echo "  nix flake check        — evaluate module + run smoke test"
            echo "  nixpkgs-fmt .          — format"
            echo "  statix check           — lint"
            echo "  deadnix --fail .       — dead-code check"
          '';
        };

        # Smoke test: build a minimal NixOS toplevel that imports the module
        # and turns it on. If the module has a type error, a missing default,
        # or it fails to compose with stock NixOS, `nix flake check` fails.
        checks.eval-example =
          (nixpkgs.lib.nixosSystem {
            inherit system;
            modules = [
              ${{ values.name }}Module
              ({ ... }: {
                # Minimal config required for evaluation
                boot.loader.grub.enable = false;
                fileSystems."/" = {
                  device = "/dev/disk/by-label/nixos";
                  fsType = "ext4";
                };
                system.stateVersion = "25.11";

                # Enable the module under test
                features.${{ values.name }} = {
                  enable = true;
                  port = ${{ values.defaultPort }};
                };
              })
            ];
          }).config.system.build.toplevel;
      });
}
