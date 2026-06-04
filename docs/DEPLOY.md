# Deploy

This Backstage instance is deployed on **p510** (the freundcloud home-lab
media server) by the NixOS module
[`modules/services/backstage.nix`](https://github.com/olafkfreund/nixos_config/blob/main/modules/services/backstage.nix)
in `olafkfreund/nixos_config`.

## Image consumption

The NixOS module pulls a **SHA-pinned** image (never `:latest`) so a deploy
is reproducible and a leaked GHCR token can't quietly swap the running
image.

```nix
features.backstage = {
  enable = true;
  image = "ghcr.io/freundcloud/backstage@sha256:<digest>";
};
```

The digest comes from the CI workflow's "Print SHA digest" step (see
GH Actions run logs).

## Rolling a deploy

1. Make a change in this repo, push to `main`
2. CI builds and pushes
3. Copy the SHA digest from the workflow output
4. In `olafkfreund/nixos_config`, edit `hosts/p510/configuration.nix` (or
   wherever `features.backstage.image` is set), paste the new digest
5. `just test-host p510` (build only — no switch)
6. `just quick-deploy p510`
7. Verify:
   - `sudo podman ps` on p510 → both `backstage` and `backstage-postgres`
     running
   - `curl -sf http://localhost:7007/healthcheck` on p510 → 200
   - `https://p510.tail833f7.ts.net/backstage` from a browser → loads

## Rollback

NixOS rollback is the fastest path:

```bash
# On p510
sudo nixos-rebuild switch --rollback
```

Or revert the nixos_config commit that bumped the digest and redeploy. The
old image is still in the local podman storage (and on ghcr.io tagged by
its commit SHA) so the rollback is cheap.

## Postgres lifecycle

- Volume: `/var/lib/backstage-postgres` on p510 (owned by container UID)
- Backup: not yet configured (see epic
  [#731](https://github.com/olafkfreund/nixos_config/issues/731) risk #6
  and Phase 5 issue
  [#736](https://github.com/olafkfreund/nixos_config/issues/736) disaster
  recovery section)
- Full reset: stop the container, `sudo rm -rf
  /var/lib/backstage-postgres`, start the container again — Backstage will
  re-discover entities from `catalog-info.yaml` files in your repos. Loses
  any user annotations made through the UI.

## Auth callback dependency

The GitHub OAuth App's authorisation callback URL is hardcoded to:

```
https://p510.tail833f7.ts.net/backstage/api/auth/github/handler/frame
```

If the tailnet hostname ever changes (tailnet rename, device re-key),
update both the OAuth App's callback URL and the
`BACKSTAGE_PUBLIC_URL` env passed to the container. The module exposes
this as `features.backstage.publicUrl`.
