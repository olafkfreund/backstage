# ${{ values.name }} — NixOS module
#
# Defines `features.${{ values.name }}` option namespace + systemd unit with
# full hardening. Consumed by other NixOS configurations via the flake
# output `nixosModules.${{ values.name }}`.
#
# Follows the conventions of olafkfreund/nixos_config:
#   - one feature flag (`enable`) as the master switch
#   - direct boolean assignment, never `mkIf cond true`
#   - secrets are paths (runtime), never inlined into the store
#   - systemd hardening is mandatory, not optional

{ config, lib, pkgs, ... }:

let
  inherit (lib) mkOption mkEnableOption mkIf types literalExpression;
  cfg = config.features.${{ values.name }};
in
{
  options.features.${{ values.name }} = {
    enable = mkEnableOption "${{ values.name }}";

    package = mkOption {
      type = types.package;
      default = pkgs.hello;
      defaultText = literalExpression "pkgs.hello";
      example = literalExpression "pkgs.${{ values.name }}";
      description = ''
        Package providing the `${{ values.name }}` binary.
        Defaults to `pkgs.hello` as a placeholder so the module evaluates
        out of the box. **Override this in your consumer config** to point
        at the real package.
      '';
    };

    port = mkOption {
      type = types.port;
      default = ${{ values.defaultPort }};
      example = 9999;
      description = ''
        TCP port the service listens on.
        Only opened in the host firewall if `openFirewall = true`;
        otherwise the service is reachable only from localhost
        (or via Tailscale Serve — see the README).
      '';
    };

    openFirewall = mkOption {
      type = types.bool;
      default = false;
      example = true;
      description = ''
        Whether to open `port` in the host firewall.
        Defaults to false — prefer Tailscale Serve for tailnet-only exposure,
        or a reverse proxy with TLS termination for public exposure.
      '';
    };

    storageDir = mkOption {
      type = types.path;
      default = "/var/lib/${{ values.name }}";
      example = "/srv/${{ values.name }}";
      description = ''
        Directory under which the service stores its persistent state.
        Managed by systemd via `StateDirectory=` — created with the right
        permissions automatically. Must be an absolute path.
      '';
    };

    logLevel = mkOption {
      type = types.enum [ "debug" "info" "warn" "error" ];
      default = "info";
      example = "debug";
      description = ''
        Log verbosity. Passed to the service as `LOG_LEVEL` in the
        environment. Logs go to the systemd journal — view with
        `journalctl -u ${{ values.name }} -f`.
      '';
    };

    settings = mkOption {
      type = with types; attrsOf anything;
      default = { };
      example = literalExpression ''
        {
          server.host = "127.0.0.1";
          server.timeout_seconds = 30;
        }
      '';
      description = ''
        Free-form settings rendered into `/etc/${{ values.name }}/config.toml`.
        Use this for upstream config keys that don't have a dedicated
        option. Keys are passed verbatim — no schema validation.
      '';
    };

{%- if values.includeAgenix %}

    passwordFile = mkOption {
      type = types.nullOr types.path;
      default = null;
      example = literalExpression ''config.age.secrets."${{ values.name }}-password".path'';
      description = ''
        Path to a file containing the service password / API key.
        Intended to be set to an agenix-decrypted path. Read at runtime
        via systemd `LoadCredential=` — never inlined into the Nix store.
        Set to `null` (default) if the service doesn't need a password.
      '';
    };

    envFile = mkOption {
      type = types.nullOr types.path;
      default = null;
      example = literalExpression ''config.age.secrets."${{ values.name }}-env".path'';
      description = ''
        Path to an `EnvironmentFile=`-compatible file (KEY=value per line).
        Use for bulk secret injection (e.g. multiple API keys) via agenix.
        File is read by systemd at unit start — never read at evaluation.
      '';
    };
{%- endif %}
  };

  config = mkIf cfg.enable {
    # Render the free-form settings into a config file in the Nix store
    # and link it into /etc. The store path is world-readable, so this
    # is appropriate for non-secret config only — secrets go through
    # passwordFile / envFile (above).
    environment.etc."${{ values.name }}/config.toml".source =
      (pkgs.formats.toml { }).generate "${{ values.name }}-config" cfg.settings;

    systemd.services.${{ values.name }} = {
      description = "${{ values.description }}";
      documentation = [ "https://github.com/${{ values.destination.owner }}/${{ values.destination.repo }}" ];

      after = [ "network-online.target" ];
      wants = [ "network-online.target" ];
      wantedBy = [ "multi-user.target" ];

      environment = {
        LOG_LEVEL = cfg.logLevel;
        PORT = toString cfg.port;
        STATE_DIR = "%S/${{ values.name }}"; # resolves to /var/lib/${{ values.name }} under DynamicUser
        CONFIG_FILE = "/etc/${{ values.name }}/config.toml";
      };

      serviceConfig = {
        Type = "simple";
        ExecStart = "${cfg.package}/bin/${{ values.name }}";
        Restart = "on-failure";
        RestartSec = "10s";

        # --- User isolation ---
        DynamicUser = true;
        StateDirectory = "${{ values.name }}";
        StateDirectoryMode = "0750";
        RuntimeDirectory = "${{ values.name }}";
        RuntimeDirectoryMode = "0750";

{%- if values.includeAgenix %}

        # --- Secrets via systemd credentials (runtime-only, never in store) ---
        LoadCredential = lib.optional (cfg.passwordFile != null)
          "password:${cfg.passwordFile}";
        EnvironmentFile = lib.optional (cfg.envFile != null) cfg.envFile;
{%- endif %}

        # --- Filesystem hardening ---
        ProtectSystem = "strict";
        ProtectHome = true;
        PrivateTmp = true;
        PrivateDevices = true;
        ReadWritePaths = [ cfg.storageDir ];

        # --- Kernel hardening ---
        ProtectKernelTunables = true;
        ProtectKernelModules = true;
        ProtectKernelLogs = true;
        ProtectControlGroups = true;
        ProtectClock = true;
        ProtectHostname = true;
        ProtectProc = "invisible";
        ProcSubset = "pid";

        # --- Process restrictions ---
        NoNewPrivileges = true;
        RestrictSUIDSGID = true;
        RestrictNamespaces = true;
        RestrictRealtime = true;
        LockPersonality = true;
        MemoryDenyWriteExecute = true;

        # --- Network restrictions ---
        RestrictAddressFamilies = [ "AF_INET" "AF_INET6" "AF_UNIX" ];
        IPAddressDeny = "any";
        IPAddressAllow = [ "localhost" "link-local" "multicast" ];

        # --- Syscall filter ---
        SystemCallFilter = [ "@system-service" "~@privileged" "~@resources" ];
        SystemCallArchitectures = "native";
        SystemCallErrorNumber = "EPERM";

        # --- Capability bounding ---
        CapabilityBoundingSet = [ "" ];
        AmbientCapabilities = [ "" ];

        # --- Resource limits (sensible defaults; tune in consumer if needed) ---
        MemoryMax = "512M";
        TasksMax = 256;
        LimitNOFILE = 4096;

        # --- Logging to journal ---
        StandardOutput = "journal";
        StandardError = "journal";
        SyslogIdentifier = "${{ values.name }}";
      };
    };

    networking.firewall.allowedTCPPorts = mkIf cfg.openFirewall [ cfg.port ];

    # Self-documenting status file — handy when SSH'ing into a host
    # and wondering what's actually configured.
    environment.etc."${{ values.name }}/README.txt".text = ''
      ${{ values.name }} — ${{ values.description }}

      State directory: ${cfg.storageDir}
      Listening port:  ${toString cfg.port}
      Firewall open:   ${if cfg.openFirewall then "yes" else "no (use Tailscale Serve or a reverse proxy)"}
      Config file:     /etc/${{ values.name }}/config.toml
      Log level:       ${cfg.logLevel}

      Management:
        Status:  systemctl status ${{ values.name }}
        Logs:    journalctl -u ${{ values.name }} -f
        Restart: systemctl restart ${{ values.name }}
    '';

    assertions = [
      {
        assertion = lib.hasPrefix "/" (toString cfg.storageDir);
        message = "features.${{ values.name }}.storageDir must be an absolute path, got: ${toString cfg.storageDir}";
      }
{%- if values.includeAgenix %}
      {
        assertion = cfg.passwordFile == null || lib.hasPrefix "/" (toString cfg.passwordFile);
        message = "features.${{ values.name }}.passwordFile must be an absolute path (typically config.age.secrets.<name>.path).";
      }
{%- endif %}
    ];
  };
}
