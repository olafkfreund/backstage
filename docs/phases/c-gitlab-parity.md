# Phase C — GitLab parity

**Issue:** [#10](https://github.com/olafkfreund/backstage/issues/10)
**PR:** [#19](https://github.com/olafkfreund/backstage/pull/19)
**Image digest:** `sha256:14ce8351…` (tag `sha-c14f5d3`)

## Goal

Same shape as GitHub: discovery + UI + scaffolder. The `gitlab`
integration block in `app-config.production.yaml` and the
agenix-encrypted `backstage-gitlab-token` were already wired from
the original portal stand-up — only the plugins themselves were
missing.

## Backend wiring

Added to `packages/backend/src/index.ts`:

```ts
backend.add(import('@backstage/plugin-catalog-backend-module-gitlab'));
backend.add(import('@backstage/plugin-scaffolder-backend-module-gitlab'));
```

The first registers `GitlabDiscoveryEntityProvider`, which scans
gitlab.com for `catalog-info.yaml` files. The second registers 12+
`gitlab:*` scaffolder actions (`publish:gitlab`, `gitlab:repo:push`,
`gitlab:projectAccessToken:create`, `gitlab:pipeline:trigger`, etc).

## Frontend wiring

```ts
import gitlabPlugin from '@immobiliarelabs/backstage-plugin-gitlab/alpha';
// ...
features: [/* ... */, gitlabPlugin],
```

The immobiliare v7+ plugin ships a clean alpha bundle that
auto-registers the GitLab entity tab + cards. The Content tab uses
`isGitlabAvailable` as its filter — it only shows on entities with
`gitlab.com/project-slug` or `gitlab.com/instance` annotations.

## Catalog provider config

`app-config.production.yaml`:

```yaml
catalog:
  providers:
    gitlab:
      olafkfreundGitlab:
        host: gitlab.com
        branch: main
        fallbackBranch: master
        catalogFile: catalog-info.yaml
        schedule:
          frequency: { hours: 1 }
          timeout: { minutes: 3 }
```

No `group:` set — the provider scans everything the configured
GITLAB_TOKEN can see. Add `group: <slug>` to narrow once there are
real GitLab projects to onboard.

## Verification log (post-deploy)

The Backstage logs immediately confirmed the wiring:

```
Starting scaffolder with the following actions enabled
  gitlab:group:ensureExists, gitlab:group:access,
  gitlab:group:migrate, gitlab:issues:create,
  gitlab:projectAccessToken:create, ...
  publish:gitlab, publish:gitlab:merge-request,
  gitlab:pipeline:trigger, ...

Registered scheduled task:
  GitlabDiscoveryEntityProvider:olafkfreundGitlab:refresh,
  {"version":2,"cadence":"PT1H","timeoutAfterDuration":"PT3M"}

Refreshing Gitlab entity discovery using discovery mode
```

The provider sits idle (zero projects discovered yet) but the whole
pipeline is ready. The moment a GitLab project gets a
`catalog-info.yaml`, it'll appear in the catalog with full
Pipelines / MRs / Releases / Code Owners / Coverage / README tabs.

## Deferred follow-up

A `publish:gitlab` scaffolder template (clone of `python-service`
swapped to publish to GitLab instead of GitHub) was scoped in the
plan but deferred — it's a 30-minute change but only worth doing
when an actual GitLab project exists to scaffold into.
