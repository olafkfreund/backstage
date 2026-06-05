# Backstage — freundcloud home lab portal

[Spotify Backstage](https://backstage.io) developer portal for the freundcloud
home lab. Deployed on **p510** via
[`olafkfreund/nixos_config`](https://github.com/olafkfreund/nixos_config)
(tracking epic:
[#731](https://github.com/olafkfreund/nixos_config/issues/731)).

This repo holds the customised Backstage application (Yarn 4 monorepo,
scaffolded with `@backstage/create-app`) plus the CI workflow that publishes
a container image to `ghcr.io/olafkfreund/backstage` on every push to
`main`. The image is consumed by the NixOS module
`modules/services/backstage.nix` in `olafkfreund/nixos_config`, which runs
it on p510 alongside a sibling Postgres container.

## Architecture in one paragraph

Frontend + backend are bundled into a single container image built from
`packages/backend/Dockerfile`. State lives in a separate Postgres container
on the same host (no SSL, localhost-only — Postgres is never exposed off
the host). GitHub OAuth handles sign-in; guest mode allows read-only
catalog browsing. Exposure is via Tailscale Serve at
`https://p510.tail833f7.ts.net/backstage` (HTTPS terminated at the
Tailscale edge — no nginx, no Let's Encrypt to manage).

## Local development

```bash
yarn install
yarn dev
```

Opens the dev portal on <http://localhost:3000> with backend on
<http://localhost:7007>. Uses in-memory SQLite — every restart starts
fresh. Use this for plugin development and UI changes; **do not** rely on
guest auth working identically to production (the production
`app-config.production.yaml` is loaded on top of `app-config.yaml` only in
the container image).

## Adding a plugin

1. `yarn add @backstage/plugin-<name>` in the right workspace
   (`packages/app` for frontend, `packages/backend` for backend)
2. Wire it in `packages/app/src/App.tsx` (frontend) or
   `packages/backend/src/index.ts` (backend) — see
   [docs/PLUGINS.md](docs/PLUGINS.md) for examples
3. `yarn dev` to verify locally
4. Commit, push — CI builds and publishes the new image
5. Bump the SHA digest in
   [`olafkfreund/nixos_config` `modules/services/backstage.nix`](https://github.com/olafkfreund/nixos_config/blob/main/modules/services/backstage.nix)

## Upgrading Backstage

```bash
yarn backstage-cli versions:bump
```

Read the release notes for breaking changes before committing — Backstage
moves fast and plugin APIs sometimes shift. Once `yarn dev` works again,
push and CI publishes a new image.

## CI / image publishing

See [`.github/workflows/build.yml`](.github/workflows/build.yml). On every
push to `main`:

1. `yarn install --immutable` (Yarn 4 via corepack)
2. `yarn tsc` + `yarn backstage-cli repo lint` + `yarn backstage-cli repo test`
3. `yarn build:backend --config app-config.production.yaml`
4. `docker build` against `packages/backend/Dockerfile`
5. Push to `ghcr.io/olafkfreund/backstage:latest` AND
   `ghcr.io/olafkfreund/backstage:sha-<commit>`
6. The job's "Print SHA digest" step emits the digest you paste into the
   NixOS module

## Repo layout

```
.
├── app-config.yaml              # Defaults (dev: SQLite, localhost URLs)
├── app-config.production.yaml   # Prod overrides (Postgres + GitHub OAuth + guest)
├── packages/
│   ├── app/                     # Frontend (React)
│   └── backend/                 # Backend (Node) + Dockerfile
├── plugins/                     # Custom plugins (empty for now)
├── .github/workflows/build.yml  # CI: build + push to ghcr.io
└── docs/
    ├── DEPLOY.md                # How nixos_config consumes the image
    └── PLUGINS.md               # Plugin add/upgrade procedure
```

## Auth and integrations day 1

- **Sign-in**: GitHub OAuth (`auth.providers.github.production`) — see
  `olafkfreund/nixos_config` issue
  [#733](https://github.com/olafkfreund/nixos_config/issues/733) for the
  OAuth App registration steps. Guest fallback is enabled for read-only
  browsing.
- **GitHub integration**: a fine-grained PAT scoped to specific repos
  populates the software catalog from `catalog-info.yaml` files. Classic
  PATs are not used — fine-grained PATs limit blast radius if leaked.

## What's intentionally NOT here yet

- **TechDocs** — needs an S3-compatible storage backend; add when there
  are docs to publish
- **Kubernetes plugin** — no live cluster on the freundcloud network
  (k3s microvms are dormant on p510)
- **Software templates / scaffolder backend** — nice-to-have, skip until
  a real reuse case exists
- **Custom plugins** — add when there's a concrete need
