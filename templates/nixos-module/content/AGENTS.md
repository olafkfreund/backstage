# AI coding agent instructions

This file is read by any AI coding assistant (Claude Code, Cursor, Copilot, Codex, Aider, etc.) before making changes. It encodes project-specific guardrails.

## Project: ${{ values.name }}

${{ values.description }}

**Stack:** NixOS module library. Flake-based. The deliverable is `nixosModules.${{ values.name }}` — consumed by other NixOS configurations, _not_ run directly.

## Required before any change

1. **Read `module.nix`** — it's the whole project. Understand the option schema before touching it.
2. **Read `flake.nix`** — confirm the flake's smoke-test host (`checks.<system>.eval-example`) still composes.
3. **Read `example/configuration.nix`** — this is the consumer contract. If you break it, you break every downstream host.
4. **Run the full check pipeline after edits:**
   ```bash
   nix flake check --print-build-logs
   nix run nixpkgs#statix -- check .
   nix run nixpkgs#deadnix -- --fail .
   nix run nixpkgs#nixpkgs-fmt -- --check .
   ```

## Conventions (non-negotiable)

- **One option namespace**: everything lives under `features.${{ values.name }}.*`. Do not pollute `services.*` or `programs.*` from this module.
- **`enable` is the master switch**: every `config` assignment is inside `mkIf cfg.enable { ... }`.
- **Direct boolean assignment, never `mkIf cond true`**: trust the module system.
- **Precise types only**: `types.port`, `types.path`, `types.enum`, `types.submodule`. No `types.anything` without a written justification in a comment.
- **Every `mkOption` has `description` and `example`**: the descriptions are surfaced in TechDocs and `nixos-options.json`.
- **Secrets are paths, never strings**: `passwordFile` / `envFile` are `types.path`. The unit reads them at runtime via `LoadCredential=` / `EnvironmentFile=`. **Never** call `builtins.readFile` on a secret.
- **Systemd hardening is mandatory**: `DynamicUser`, `ProtectSystem="strict"`, `ProtectHome`, `PrivateTmp`, `NoNewPrivileges`, `RestrictSUIDSGID`, `SystemCallFilter=["@system-service" "~@privileged"]`. If you have to relax one, leave a comment explaining why.
- **Logging via journald**: `StandardOutput=journal`, `StandardError=journal`. No log files in `/var/log` unless the upstream forces it.
- **`openFirewall` defaults to `false`**: prefer Tailscale Serve. The example shows both.

## Anti-patterns this module must not contain

- `mkIf true ...`
- `with lib;` at the file top-level (use `inherit (lib) mkOption mkIf types ...` instead)
- `rec { ... }` where a plain `let ... in` would do
- `builtins.readFile` on anything sensitive
- `services.<name>.enable = true;` outside the `config = mkIf cfg.enable { ... }` block
- Hardcoded paths under `/home`, `/root`, `/tmp` (use `StateDirectory` / `RuntimeDirectory` / `CacheDirectory`)
- Auto-discovery via `readDir` / `mapAttrs' readDir` — imports must be explicit

## When adding a new option

Follow `.claude/skills/add-option.md`. Summary:

```nix
options.features.${{ values.name }}.yourOption = mkOption {
  type = types.port;          # precise
  default = 9090;             # sensible
  example = 9999;             # not the same as default
  description = ''
    What this controls. Why someone would change it. What breaks if they set it wrong.
  '';
};
```

Wire it into `config = mkIf cfg.enable { ... }` and run `nix flake check`.

## When adding a constraint the type system can't express

Use an assertion:

```nix
assertions = [
  {
    assertion = !(cfg.openFirewall && cfg.tailscaleServe.enable);
    message = "features.${{ values.name }}: openFirewall and tailscaleServe are mutually exclusive — pick one.";
  }
];
```

## Backstage integration (do not break)

This repo is registered in Backstage via `catalog-info.yaml`. Contracts:

1. **`spec.type: library`** — this is _not_ a service. Do not change it to `service`.
2. **`backstage.io/techdocs-ref: dir:.`** — TechDocs builds from this repo's `mkdocs.yml`. Don't move or rename the docs.
3. **No `spec.providesApis`** — this module exposes a Nix interface, not an HTTP API.

## Out of scope without explicit ask

- Adding a Home Manager module (this is system-scope only — fork the template if you need a HM variant)
- Adding a package definition (the module consumes `cfg.package` — package the binary elsewhere)
- Adding Kubernetes manifests / Docker images
- Adding metrics export — wire upstream metrics into Prometheus via the consumer host, not from inside this module
