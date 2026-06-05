# Integrations

The portal aggregates data from several systems. Each integration is
documented in its own page below.

| Integration | Status | Where it surfaces |
|-------------|--------|-------------------|
| [GitHub](github.md) | Live | catalog discovery (50+ repos), entity tabs, 4 home widgets, 5 community plugins |
| [GitLab](gitlab.md) | Live (idle) | catalog discovery scheduled hourly, scaffolder actions registered, entity tabs gated by `gitlab.com/project-slug` |
| [Events + Webhooks](events.md) | Live | `/api/events/http/github` with HMAC validation, broadcast to `github:activity` signals channel |
| [MCP for AI agents](mcp.md) | Live | bearer-token API at `/api/mcp-actions/v1/{catalog,scaffolder,techdocs}` for Claude Code etc |

## Token + secret topology

All four integrations consume agenix-encrypted secrets, bridged into
the container env by `backstage-env-setup.service` on p510:

| Secret | Used by | Scope |
|--------|---------|-------|
| `backstage-github-token` | GitHub catalog + scaffolder + entity widgets | Fine-grained PAT, repos: all, perms: contents/metadata/pull_requests/issues/security_events read |
| `backstage-github-oauth-client-id` + `-client-secret` | Auth provider for sign-in | OAuth App on github.com |
| `backstage-github-webhook-secret` | Events backend HMAC validation | 64 hex chars, random per install |
| `backstage-gitlab-token` | GitLab catalog + scaffolder | Personal access token, projects: read_api |
| `backstage-mcp-token` | MCP bridge bearer auth | 64 hex chars, embedded in client config |
| `backstage-postgres-password` | Internal — backstage-postgres container | Random per install |

None of the secrets land in the Nix store — agenix decrypts each at
activation and the env-setup oneshot writes them into tmpfs at
`/run/backstage/env-backstage` which the container loads via
`EnvironmentFile=`.
