# Development

## Prerequisites

You need Nix with flakes enabled. On NixOS that's built in; on other systems install [nix-installer](https://github.com/DeterminateSystems/nix-installer) and add `experimental-features = nix-command flakes` to `~/.config/nix/nix.conf`.

## Dev shell (with direnv — recommended)

```bash
direnv allow            # one-time per checkout
# now `nix`, `nixpkgs-fmt`, `statix`, `deadnix` are on PATH
```

Without direnv: `nix develop`.

## The five commands you actually run

```bash
# Evaluate the module, run flake checks (the big one)
nix flake check --print-build-logs

# Lint
statix check

# Dead-code detection
deadnix --fail

# Format check (must pass in CI)
nixpkgs-fmt --check .

# Format in place
nixpkgs-fmt .
```

All four lint/check commands are what CI runs.

## What `nix flake check` actually does here

The flake declares a **smoke-test host** in `checks.<system>.eval-example` that:

1. Imports `nixosModules.${{ values.name }}`
2. Sets `features.${{ values.name }}.enable = true`
3. Builds the resulting `toplevel` derivation

If the module has a type error, a missing assertion, an undefined attribute, or it fails to compose with a stock NixOS config, this build fails. That's the contract CI enforces.

## Adding a new option

Use the `.claude/skills/add-option.md` skill — it walks through validation, defaults, descriptions, and examples. Summary:

1. Add the `mkOption` block to `module.nix` under `options.features.${{ values.name }}`
2. Use a precise type (`types.port`, `types.path`, `types.enum [...]`, `types.submodule { ... }`) — not `types.anything` unless you have a reason
3. Provide `default`, `example`, and `description`
4. Wire it into the `config = mkIf cfg.enable { ... }` block
5. Add an assertion if there's a constraint the type system can't express
6. Run `nix flake check` and confirm it still builds

## Adding a NixOS VM test (optional but encouraged)

Append to `flake.nix`:

```nix
checks.${system}.vm-test = pkgs.nixosTest {
  name = "${{ values.name }}-vm";
  nodes.machine = { ... }: {
    imports = [ self.nixosModules.${{ values.name }} ];
    features.${{ values.name }}.enable = true;
  };
  testScript = ''
    machine.start()
    machine.wait_for_unit("${{ values.name }}.service")
    machine.wait_for_open_port(${{ values.defaultPort }})
    machine.succeed("curl -fsS http://localhost:${{ values.defaultPort }}/")
  '';
};
```

Then `nix flake check` runs it too.

## Security checklist (before merging)

- [ ] Module sets `DynamicUser = true` OR creates a dedicated `users.users.<name>` + `users.groups.<name>`
- [ ] `ProtectSystem = "strict"`, `ProtectHome = true`, `PrivateTmp = true`, `NoNewPrivileges = true` are all set
- [ ] `SystemCallFilter` includes `@system-service` and excludes `@privileged` / `@resources` unless required
- [ ] No secrets read via `builtins.readFile` — secret options are `types.path` and the unit consumes them via `LoadCredential=` or `EnvironmentFile=`
- [ ] `openFirewall` defaults to `false`
- [ ] All `mkOption` blocks have `description` set

## CI

`.github/workflows/ci.yml` runs:

- `nix flake check`
- `statix check`
- `deadnix --fail`
- `nixpkgs-fmt --check`

All four must pass. The workflow uses the official `DeterminateSystems/nix-installer-action` + `DeterminateSystems/magic-nix-cache-action` for fast, cached builds.
