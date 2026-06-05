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

        # Native deps required by libcosmic / Iced 0.13.
        # If you add a new top-level Rust dep that links to a C lib, add it here too.
        nativeBuildInputs = with pkgs; [
          pkg-config
          autoPatchelfHook
          just
        ];
        buildInputs = with pkgs; [
          libxkbcommon
          wayland
          fontconfig
          freetype
          expat
          libGL
          vulkan-loader
        ];
      in {
        packages.default = pkgs.rustPlatform.buildRustPackage {
          pname = "${{ values.name }}";
          version = "0.1.0";
          src = ./.;

          cargoLock = {
            lockFile = ./Cargo.lock;
            # libcosmic is a git dep; outputHashes go here once the lockfile is generated.
            # Run `nix build` once, copy the suggested hashes into this attrset.
            allowBuiltinFetchGit = true;
          };

          inherit nativeBuildInputs buildInputs;

          # The .desktop file teaches the COSMIC panel about the applet.
          postInstall = ''
            install -Dm644 res/${{ values.appletId }}.desktop \
              $out/share/applications/${{ values.appletId }}.desktop
          '';

          meta = {
            description = "${{ values.description }}";
            homepage = "https://github.com/${{ values.destination.owner }}/${{ values.destination.repo }}";
            license = with pkgs.lib.licenses; [ mit asl20 ];
            mainProgram = "${{ values.name }}";
            platforms = pkgs.lib.platforms.linux;
          };
        };

        devShells.default = pkgs.mkShell {
          inherit nativeBuildInputs buildInputs;
          packages = [
            toolchain
            pkgs.cargo-audit
            pkgs.cargo-edit
            pkgs.cargo-watch
          ];

          # libcosmic loads libGL / vulkan at runtime; expose them.
          LD_LIBRARY_PATH = pkgs.lib.makeLibraryPath buildInputs;
          RUST_BACKTRACE = "1";
          RUST_LOG = "info,${{ values.name }}=debug";
        };
      });
}
