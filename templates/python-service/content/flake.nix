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
        python = pkgs.python312;
      in {
        devShells.default = pkgs.mkShell {
          packages = [
            python
            pkgs.uv
            pkgs.ruff
            pkgs.mypy
            pkgs.jq
          ];

          # Keep uv from downloading its own Python; use the one from Nix.
          env = {
            UV_PYTHON_DOWNLOADS = "never";
            UV_PYTHON = "${python}/bin/python";
            PYTHONDONTWRITEBYTECODE = "1";
            PYTHONUNBUFFERED = "1";
            LOG_LEVEL = "debug";
            PORT = "${{ values.listenPort }}";
          };

          shellHook = ''
            echo "${{ values.name }} dev shell"
            echo "  python: $(python --version)"
            echo "  uv:     $(uv --version)"
            echo
            echo "  uv sync                                    # install deps"
            echo "  uv run uvicorn app.main:app --reload       # run the service"
            echo "  uv run pytest                              # run tests"
          '';
        };

        packages.default = python.pkgs.buildPythonApplication {
          pname = "${{ values.name }}";
          version = "0.1.0";
          src = ./.;
          pyproject = true;

          nativeBuildInputs = [ python.pkgs.hatchling ];

          propagatedBuildInputs = with python.pkgs; [
            fastapi
            uvicorn
            pydantic
            structlog
          ];

          meta = {
            description = "${{ values.description }}";
            homepage = "https://github.com/${{ values.destination.owner }}/${{ values.destination.repo }}";
            license = with pkgs.lib.licenses; [ mit asl20 ];
            mainProgram = "${{ values.name }}";
          };
        };
      });
}
