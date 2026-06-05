# Example consumer configuration for ${{ values.name }}
#
# This is what a downstream host looks like after importing the module.
# Copy the relevant bits into your own host's configuration.nix.
#
# Prerequisites in the consumer flake:
#   inputs.${{ values.name }}.url = "github:${{ values.destination.owner }}/${{ values.destination.repo }}";
#
# Then in the host module list:
#   inputs.${{ values.name }}.nixosModules.${{ values.name }}

{ config, lib, pkgs, ... }:

{
  # ─── Minimal usage ────────────────────────────────────────────────
  features.${{ values.name }} = {
    enable = true;
    port = ${{ values.defaultPort }};
  };

  # ─── With persistent storage in a non-default location ────────────
  # features.${{ values.name }}.storageDir = "/srv/${{ values.name }}";

  # ─── With custom settings rendered into /etc/${{ values.name }}/config.toml ─
  # features.${{ values.name }}.settings = {
  #   server.host = "127.0.0.1";
  #   server.timeout_seconds = 30;
  #   logging.format = "json";
  # };

{%- if values.includeAgenix %}

  # ─── With agenix secrets ──────────────────────────────────────────
  #
  # 1. Declare the secret in secrets.nix at the flake root:
  #
  #    {
  #      "${{ values.name }}-password.age".publicKeys = [
  #        "ssh-ed25519 AAAA... host-key-of-this-box"
  #        "ssh-ed25519 AAAA... your-personal-key"
  #      ];
  #    }
  #
  # 2. Create the encrypted file:
  #
  #    cd secrets/
  #    agenix -e ${{ values.name }}-password.age
  #
  # 3. Reference it from the host config:
  #
  # age.secrets."${{ values.name }}-password" = {
  #   file = ../secrets/${{ values.name }}-password.age;
  #   mode = "0400";
  #   owner = "root"; # systemd LoadCredential reads as root, drops to DynamicUser
  # };
  #
  # features.${{ values.name }} = {
  #   enable = true;
  #   passwordFile = config.age.secrets."${{ values.name }}-password".path;
  # };
{%- endif %}

{%- if values.includeTailscaleServe %}

  # ─── Expose over Tailscale Serve (no firewall hole) ───────────────
  #
  # Reachable at https://<hostname>.<tailnet>.ts.net with valid certs.
  # Keeps openFirewall = false; nothing is exposed to the public internet.

  services.tailscale = {
    enable = true;
    useRoutingFeatures = "server";
  };

  systemd.services."${{ values.name }}-tailscale-serve" = {
    description = "Expose ${{ values.name }} via Tailscale Serve";
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
{%- endif %}

  # ─── Extra tmpfiles rules (cache, scratch, etc.) ──────────────────
  # systemd.tmpfiles.rules = [
  #   "d /var/cache/${{ values.name }} 0750 ${{ values.name }} ${{ values.name }} -"
  # ];
}
