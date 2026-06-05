# ${{ values.name }}

${{ values.description }}

## What it is

`${{ values.name }}` is a **NixOS module library** — a small flake whose only output of interest is `nixosModules.${{ values.name }}`. It defines:

- An option namespace `features.${{ values.name }}` (master switch + tunables)
- A systemd unit with full hardening (`DynamicUser`, `ProtectSystem=strict`, syscall filter, ...)
- Optional [agenix](https://github.com/ryantm/agenix) secret slots (`passwordFile`, `envFile`)
- An optional [Tailscale Serve](https://tailscale.com/kb/1242/tailscale-serve) example for zero-firewall exposure

It follows the conventions of [olafkfreund/nixos_config](https://github.com/olafkfreund/nixos_config): one feature flag, hardening by default, secrets via path references (never read at eval time).

## How a consumer uses it

```nix
# flake.nix of a consumer
{
  inputs.${{ values.name }}.url = "github:${{ values.destination.owner }}/${{ values.destination.repo }}";

  outputs = { self, nixpkgs, ${{ values.name }}, ... }: {
    nixosConfigurations.myhost = nixpkgs.lib.nixosSystem {
      system = "x86_64-linux";
      modules = [
        ${{ values.name }}.nixosModules.${{ values.name }}
        ({ ... }: {
          features.${{ values.name }} = {
            enable = true;
            port = ${{ values.defaultPort }};
          };
        })
      ];
    };
  };
}
```

## Architecture

```text
┌─────────────────────────────────────────────────────────┐
│ flake.nix                                               │
│   outputs.nixosModules.${{ values.name }} ─┐                       │
│                                  │                      │
│  ┌───────────────────────────────▼─────────────────┐    │
│  │ module.nix                                      │    │
│  │   options.features.${{ values.name }} = { ... };           │    │
│  │   config = mkIf cfg.enable {                    │    │
│  │     systemd.services.${{ values.name }} = {                │    │
│  │       serviceConfig = { hardening... };         │    │
│  │     };                                          │    │
│  │   };                                            │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

## Next steps

- [Development guide](development.md) — how to add options, run tests, format code
