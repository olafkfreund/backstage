{
  description = "${{ values.description }}";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    rust-overlay.url = "github:oxalica/rust-overlay";
  };

  outputs = { self, nixpkgs, flake-utils, rust-overlay }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
          overlays = [ (import rust-overlay) ];
        };
        toolchain = pkgs.rust-bin.stable.latest.default.override {
          extensions = [ "rust-src" "rustfmt" "clippy" ];
        };
      in {
        packages.default = pkgs.rustPlatform.buildRustPackage {
          pname = "${{ values.name }}";
          version = "0.1.0";
          src = ./.;
          cargoLock.lockFile = ./Cargo.lock;
          meta = {
            description = "${{ values.description }}";
            homepage = "https://github.com/${{ values.destination.owner }}/${{ values.destination.repo }}";
            license = with pkgs.lib.licenses; [ mit asl20 ];
          };
        };

        devShells.default = pkgs.mkShell {
          packages = [
            toolchain
            pkgs.cargo-audit
            pkgs.cargo-edit
            pkgs.cargo-watch
            pkgs.pkg-config
            pkgs.openssl
          ];
          RUST_BACKTRACE = "1";
          RUST_LOG = "info,${{ values.name }}=debug";
        };
      });
}
