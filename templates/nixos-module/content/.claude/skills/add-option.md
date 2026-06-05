---
name: add-option
description: Add a new mkOption to the NixOS module with validation, default value, description, and example — and wire it into the config block.
---

# Add an option to features.${{ values.name }}

When the user asks to add a new option to this NixOS module, follow these steps **in order**. Verify each step before continuing.

## 1. Read the existing schema first

Open `module.nix` and locate the `options.features.${{ values.name }} = { ... };` block. Skim every existing option so the new one is consistent with the style (alphabetical ordering, indentation, where assertions live).

## 2. Choose a precise type

Do **not** default to `types.anything` or `types.str`. Pick the tightest type that expresses the intent:

| Intent | Type |
|---|---|
| TCP/UDP port | `types.port` |
| Filesystem path (existing) | `types.path` |
| Filesystem path (or null) | `types.nullOr types.path` |
| One of a fixed set | `types.enum [ "a" "b" "c" ]` |
| Bytes / size | `types.either types.int types.str` then validate with assertion |
| List of strings | `types.listOf types.str` |
| Submodule (structured) | `types.submodule { options = { ... }; }` |
| Free-form settings file | `types.attrsOf types.anything` (last resort, document why) |

For secrets, **always** use `types.nullOr types.path` — never `types.str`. The path is read at runtime, never at eval.

## 3. Write the `mkOption` block

Location: inside `options.features.${{ values.name }} = { ... };` in `module.nix`. Keep it alphabetically ordered with the existing options.

```nix
yourOption = mkOption {
  type = types.port;
  default = 9090;
  example = 9999;
  description = ''
    One sentence: what this controls.
    One sentence: when someone would want to change it.
    One sentence: what breaks (or what default behaviour they lose) if it's misconfigured.
  '';
};
```

**Rules:**

- `default` is the value 95% of users will want. Make it work without any config.
- `example` must be _different_ from `default` (otherwise it's noise).
- `description` is multi-line `''...''` (Nix indented strings). Three short sentences > one long paragraph.
- For submodules, give each sub-option its own `description`. The nested ones show up in `nixos-options.json` too.

## 4. Wire it into `config`

The option does nothing until something reads `cfg.yourOption`. Add it to the relevant branch of `config = mkIf cfg.enable { ... };`:

```nix
systemd.services.${{ values.name }}.serviceConfig = {
  Environment = [
    "PORT=${toString cfg.port}"
    "YOUR_THING=${toString cfg.yourOption}"   # ← new
  ];
};
```

Or if it's a settings-file value:

```nix
environment.etc."${{ values.name }}/config.toml".source =
  (pkgs.formats.toml { }).generate "${{ values.name }}-config" cfg.settings;
```

## 5. Add an assertion if the type can't express the constraint

Examples that need assertions (the type system can't catch these):

- "port and tailscaleServe.enable are mutually exclusive"
- "storageDir must be absolute"
- "if passwordFile is null, password must be set in settings" (and vice versa)

Append to the `assertions` list at the end of the `config = mkIf cfg.enable { ... }` block:

```nix
assertions = [
  {
    assertion = cfg.yourOption > 1024 || cfg.allowPrivilegedPorts;
    message = ''
      features.${{ values.name }}.yourOption = ${toString cfg.yourOption} is a privileged port (<1024).
      Either pick a port >= 1024 or set features.${{ values.name }}.allowPrivilegedPorts = true.
    '';
  }
];
```

## 6. Verify

Run the full pipeline:

```bash
nix flake check --print-build-logs
nix run nixpkgs#statix -- check .
nix run nixpkgs#deadnix -- --fail .
nix run nixpkgs#nixpkgs-fmt -- --check .
```

All four must pass. If `nix flake check` fails, the smoke-test host in `checks.<system>.eval-example` couldn't compose with the new option — usually a typo in the default value or a missing wire-up in `config`.

## 7. Show it works

Flip the option in `example/configuration.nix`:

```nix
features.${{ values.name }} = {
  enable = true;
  yourOption = 9999;   # ← demonstrate the new option
};
```

Run `nix flake check` once more to prove the consumer-style usage still evaluates.

## 8. Document it

- Add a row to the **Options** table in `README.md`
- If it's a security-relevant option, add a line to the security checklist in `docs/development.md`

## 9. Commit message

Use Conventional Commits:

```
feat(module): add features.${{ values.name }}.yourOption

Allows consumers to override <thing>. Type is types.port (precise),
default 9090 matches upstream. Includes assertion guarding against
privileged ports unless allowPrivilegedPorts is also set.
```
