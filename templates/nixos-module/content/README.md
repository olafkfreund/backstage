# ${{ values.name }}

${{ values.description }}

Scaffolded from the **nixos-module** template in [olafkfreund/backstage](https://github.com/olafkfreund/backstage/tree/main/templates/nixos-module). This repository is a **NixOS module library** — it exposes a flake output `nixosModules.${{ values.name }}` that other NixOS configurations import and enable via the `features.${{ values.name }}` option namespace.

It is _not_ a runnable service on its own. The "build artifact" is the module itself; CI validates it with `nix flake check`.

## Quick start

### 1. Consume the module from another flake

```nix
# flake.nix of a consumer host
{
  inputs.${{ values.name }}.url = "github:${{ values.destination.owner }}/${{ values.destination.repo }}";

  outputs = { self, nixpkgs, ${{ values.name }}, ... }: {
    nixosConfigurations.myhost = nixpkgs.lib.nixosSystem {
      system = "x86_64-linux";
      modules = [
        ${{ values.name }}.nixosModules.${{ values.name }}
        ./configuration.nix
      ];
    };
  };
}
```

### 2. Enable it on a host

```nix
# configuration.nix
{
  features.${{ values.name }} = {
    enable = true;
    port = ${{ values.defaultPort }};
    storageDir = "/var/lib/${{ values.name }}";
  };
}
```

That's it. See [`example/configuration.nix`](./example/configuration.nix) for a complete, copy-pasteable host snippet.

## Options

| Option | Type | Default | Purpose |
|---|---|---|---|
| `features.${{ values.name }}.enable` | bool | `false` | Master switch. |
| `features.${{ values.name }}.package` | package | `pkgs.hello` (placeholder) | The package that provides the binary. **Override this in your fork.** |
| `features.${{ values.name }}.port` | port | `${{ values.defaultPort }}` | TCP port the service listens on. |
| `features.${{ values.name }}.openFirewall` | bool | `false` | If true, opens `port` in the host firewall. Prefer Tailscale Serve instead. |
| `features.${{ values.name }}.storageDir` | str | `/var/lib/${{ values.name }}` | StateDirectory under `/var/lib`. |
| `features.${{ values.name }}.logLevel` | enum | `"info"` | `debug` / `info` / `warn` / `error`. |
| `features.${{ values.name }}.settings` | attrs | `{}` | Free-form key/value rendered into the service config file. |
{%- if values.includeAgenix %}
| `features.${{ values.name }}.passwordFile` | path or null | `null` | Path to an agenix-decrypted password file. Mounted at runtime, never read at eval. |
| `features.${{ values.name }}.envFile` | path or null | `null` | Path to an `EnvironmentFile=`-compatible file (e.g. agenix-decrypted env vars). |
{%- endif %}

Full option docs are rendered into `nixos-options.json` by `nix flake check` and surfaced in the Backstage TechDocs.

{%- if values.includeAgenix %}

## Secrets (agenix)

This module ships secret _slots_, not secrets themselves. To use them:

### `secrets.nix` (in the consumer flake)

```nix
{
  "${{ values.name }}-password.age".publicKeys = [
    "ssh-ed25519 AAAA..."  # host key of the box that will run this
    "ssh-ed25519 AAAA..."  # your personal ssh key (to edit)
  ];
}
```

### `configuration.nix`

```nix
{
  age.secrets."${{ values.name }}-password" = {
    file = ./secrets/${{ values.name }}-password.age;
    owner = "root";
    group = "root";
    mode = "0400";
  };

  features.${{ values.name }} = {
    enable = true;
    passwordFile = config.age.secrets."${{ values.name }}-password".path;
  };
}
```

The systemd unit reads `passwordFile` at start time via `LoadCredential=` — never inlined into the Nix store.
{%- endif %}

## State directory & tmpfiles

The module declares `StateDirectory=${{ values.name }}` on the unit, so systemd creates `/var/lib/${{ values.name }}` with the right permissions automatically. If you need extra paths (e.g. a separate cache dir), add tmpfiles rules in your host config:

```nix
systemd.tmpfiles.rules = [
  "d /var/cache/${{ values.name }} 0750 ${{ values.name }} ${{ values.name }} -"
];
```

{%- if values.includeTailscaleServe %}

## Tailscale Serve (zero-firewall exposure)

Instead of opening `port` in the host firewall, expose the service over your tailnet only:

```nix
{
  services.tailscale.enable = true;

  # On NixOS 25.05+:
  services.tailscale.useRoutingFeatures = "server";

  # Aggregator: run after the module is up
  systemd.services.${{ values.name }}-tailscale-serve = {
    description = "Expose ${{ values.name }} over Tailscale Serve";
    after = [ "${{ values.name }}.service" "tailscaled.service" ];
    requires = [ "${{ values.name }}.service" "tailscaled.service" ];
    wantedBy = [ "multi-user.target" ];
    serviceConfig = {
      Type = "oneshot";
      RemainAfterExit = true;
      ExecStart = "${pkgs.tailscale}/bin/tailscale serve --bg --https=443 http://127.0.0.1:${toString config.features.${{ values.name }}.port}";
      ExecStop = "${pkgs.tailscale}/bin/tailscale serve --https=443 off";
    };
  };
}
```

The service is now reachable at `https://<hostname>.<tailnet>.ts.net` with valid certs — no inbound firewall rule, no public exposure.
{%- endif %}

## Backstage integration

- **Catalog**: `catalog-info.yaml` registers this as a `Component` with `spec.type: library`. After merging, it appears in the Backstage catalog within ~1 hour (or instantly after a Backstage restart).
- **Docs**: `mkdocs.yml` + `docs/` are wired for TechDocs.
- **No API entity**: this is a Nix library, not a service exposing an HTTP API. `spec.providesApis` is intentionally absent.

## CI

GitHub Actions on every push:

- `nix flake check` — evaluates the module against an example host and runs any flake-defined tests
- `statix check` — Nix linter (catches anti-patterns)
- `deadnix --fail` — detects unused bindings
- `nixpkgs-fmt --check` — formatting must match nixpkgs style

All four jobs must pass before a PR can merge.

## AI coding assistants

`AGENTS.md` encodes project-specific guardrails for any AI coding agent (Claude Code, Cursor, Copilot, Codex, Aider). `.claude/skills/add-option.md` is a step-by-step skill for adding a new `mkOption` correctly.

## License

Dual-licensed under MIT or Apache-2.0.
