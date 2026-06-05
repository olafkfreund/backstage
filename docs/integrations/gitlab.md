# GitLab integration

See [Phase C](../phases/c-gitlab-parity.md) for the architecture and
wiring history.

## Status

Live but idle. The `GitlabDiscoveryEntityProvider` is scheduled
hourly with a 3-minute timeout and currently has zero projects to
discover (the personal `olafkfreund` GitLab account has no projects).
The infrastructure is ready — the moment a GitLab project gets a
`catalog-info.yaml` with a `gitlab.com/project-slug` annotation, it
appears in the catalog with full entity tabs.

## What activates per-entity

The immobiliare plugin (`@immobiliarelabs/backstage-plugin-gitlab`,
v7+) ships an alpha bundle that registers:

- **Tab: Gitlab** — Pipelines + Merge Requests + Releases + Code
  Owners + Coverage + README, gated by `isGitlabAvailable` (an
  annotation check the plugin owns)
- **Overview cards** — 9 of them (Readme, Coverage, Releases,
  MergeRequestsStats, People, Languages, IssuesTable, PipelinesTable,
  MergeRequestsTable). **All 9 are disabled** in `app-config` because
  they don't check for the annotation and would fire API calls
  against any entity — including GitHub-only ones — with the
  GitHub slug as the GitLab project ID, returning a flood of "wrong
  project_slug or project_id" alerts. Re-enable once there are real
  GitLab projects to render against.

## Scaffolder

The official `@backstage/plugin-scaffolder-backend-module-gitlab`
registers 12+ actions, including:

| Action | What it does |
|--------|--------------|
| `publish:gitlab` | Creates and pushes a new repo |
| `publish:gitlab:merge-request` | Pushes a branch + opens an MR |
| `gitlab:group:ensureExists` | Idempotent group bootstrap |
| `gitlab:group:access` | Grants a user/group access to a group |
| `gitlab:projectAccessToken:create` | Creates a deploy token |
| `gitlab:projectDeployToken:create` | Same, scoped to deploy tokens |
| `gitlab:projectVariable:create` | Adds a CI variable |
| `gitlab:pipeline:trigger` | Triggers a pipeline run |
| `gitlab:issue:edit` / `:create` | MR/issue manipulation |

These are usable from any template. The current 11 templates all
target `publish:github` — a `python-service-gitlab` variant could be
cloned in 30 minutes when there's a reason to scaffold into GitLab.

## Token

The `backstage-gitlab-token` agenix secret is a personal access
token with `read_api` scope. Bridged into the container env as
`GITLAB_TOKEN` via the same `backstage-env-setup.service` pattern as
the GitHub token.
