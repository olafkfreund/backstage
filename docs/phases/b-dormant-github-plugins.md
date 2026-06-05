# Phase B — Dormant GitHub plugins

**Issue:** [#9](https://github.com/olafkfreund/backstage/issues/9)
**Follow-up:** [#18](https://github.com/olafkfreund/backstage/issues/18) for the legacy routable plugins
**Image digest:** `sha256:e22ae753…` (tag `sha-3b21c6f`) after the cleanup landed

## Goal

Eight plugins were sitting in `packages/app/package.json` doing
nothing — the scaffolded app installed them but never wired any of
them as features. Surface their data on entity pages where possible.

## What worked (auto-wired via plugin alpha bundles)

| Plugin | Surface |
|--------|---------|
| `@roadiehq/backstage-plugin-github-insights` | "GitHub Insights" entity tab with Contributors / Languages / Releases / README / Environments cards |
| `@backstage-community/plugin-github-deployments` | Overview card showing live deployment data |

These plugins ship a proper `/alpha` export. `@backstage/plugin-catalog/alpha`
discovers them in `node_modules` and auto-attaches their content as
tabs/cards, gated by `github.com/project-slug`. No code in our app
beyond `catalogPlugin` itself.

## What didn't (uninstalled, tracked in #18)

| Plugin | Why it failed |
|--------|---------------|
| `@backstage/plugin-github-actions` | Legacy `createRoutableExtension` mounting fails |
| `@roadiehq/backstage-plugin-github-pull-requests` | Same routeRef issue |
| `@roadiehq/backstage-plugin-security-insights` | Same routeRef issue |

The error was always the same: `Routable extension component with
mount point routeRef{type=absolute,id=…} was not discovered`.

Both `compatWrapper` and `convertLegacyPlugin` from
`@backstage/core-compat-api` were tried; neither bound the legacy
plugin's `rootRouteRef` to the path declared in my
`EntityContentBlueprint.make()`. The plugins' `EntityXxxContent`
components call `useRouteRef(rootRouteRef)` at render time to figure
out where they're mounted — and the new declarative router doesn't
know unless you wire `app.routes.bindings` explicitly per plugin.

The pragmatic call after multiple iterations: **uninstall the three
problematic packages entirely**. `@backstage/plugin-catalog/alpha`'s
auto-discovery picks them up just by being in `node_modules`, so
they kept rendering errored tabs even after I removed every import.
Physically removing the dependency was the only reliable fix. The
issue tracking the proper convertLegacyRouteRef + routeBindings
solution is open at #18.

## Bonus from cleanup

Two community successors were later installed in PR #24 that gave
us back what the legacy plugins promised:

- `@backstage-community/plugin-github-actions` — entity tab with
  Recent Workflow Runs (works perfectly)
- `@backstage-community/plugin-github-issues` — entity tab with
  open issues for the repo
- `@backstage-community/plugin-github-pull-requests-board` — full
  PR board page

All three have alpha bundles and the routeRef hurdle vanishes.

## Other UX fixes shipped in Phase B's cleanup

- Hid the noisy `github-insights` Compliance card via
  `app.extensions: entity-card:code-insights/compliance: false` in
  `app-config.production.yaml`. The card was warning "Protected
  Branches: None / License: None" on every entity, which is signal
  but with extreme volume. Re-enable when every repo has branch
  protection + LICENSE.
- Disabled 9 GitLab overview cards via the same mechanism. The
  immobiliare plugin attaches them to every entity without checking
  for `gitlab.com/project-slug`, so each card fires a GitLab API
  call against the GitHub slug, gets 400, and renders a "wrong
  project_slug or project_id" alert. The cards stay disabled until
  there are GitLab projects with proper annotations.
