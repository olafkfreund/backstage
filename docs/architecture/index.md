# Architecture

The portal is a Yarn 4 monorepo with two workspaces:

- `packages/app` — frontend React app, built with `@backstage/cli`
- `packages/backend` — Express-based backend, also `@backstage/cli`

Both use the **new declarative frontend / backend systems**, not the
legacy `createRoutableExtension` / `createRouter` patterns.

## Quick map

| Area | File |
|------|------|
| Frontend entry | `packages/app/src/App.tsx` — `createApp({ features: [...] })` |
| Backend entry | `packages/backend/src/index.ts` — `createBackend()` + `backend.add(...)` |
| Custom modules | `packages/app/src/modules/{nav,home,signInPage,theme}/` |
| Custom backend module | `packages/backend/src/modules/signalsGithubBridge.ts` |
| Scaffolder templates | `templates/<name>/template.yaml` + `templates/<name>/content/` |
| Catalog seed | `catalog-info.yaml` (this file describes the portal itself) |
| TechDocs | `docs/` + `mkdocs.yml` (built locally by the techdocs backend at view time) |
| App config | `app-config.yaml` (dev), `app-config.production.yaml` (deployed) |
| Dockerfile | `packages/backend/Dockerfile` |
| CI | `.github/workflows/build.yml` |
| Onboarder bots | `.github/workflows/{catalog,techdocs,apis}-onboard.yml` |

## Module + plugin inventory

See [Plugins](../PLUGINS.md) for the full installed list.

## Deeper pages

- [Declarative Frontend](declarative-frontend.md) — how `createApp`
  features compose into the running app
- [Custom Modules](custom-modules.md) — the four module folders under
  `packages/app/src/modules/`
- [Theme System](theme.md) — how the Gruvbox themes are wired
