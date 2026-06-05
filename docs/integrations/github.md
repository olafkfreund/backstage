# GitHub integration

## Discovery

`GithubEntityProvider` runs hourly against `olafkfreund` (personal
account → `/users/X/repos`), looking for `catalog-info.yaml` at the
root of each repo. Repos without one are silent until the
catalog-onboard workflow opens a PR adding one.

```yaml
catalog:
  providers:
    github:
      olafkfreundAllRepos:
        organization: olafkfreund
        catalogPath: /catalog-info.yaml
        schedule:
          frequency: { hours: 1 }
          timeout: { minutes: 3 }
```

50+ repos appear in the catalog after the first scan.

## Auth providers

GitHub OAuth + Guest. The OAuth callback URL on the GitHub App is:

```
https://p510.tail833f7.ts.net/backstage/api/auth/github/handler/frame
```

`usernameMatchingUserEntityName` resolver matches the GitHub username
(`olafkfreund`) to the seed `User` entity in
`olafkfreund/nixos_config/catalog-info.yaml`.

## Frontend widgets (home page)

Four widgets fetch via the user's OAuth token, no plugin dependency:

| Widget | GitHub endpoint | Refresh |
|--------|-----------------|---------|
| `OrgOpenPrs` | `/search/issues?q=is:pr+is:open+author:olafkfreund` | 5 min poll |
| `ReviewRequested` | `/search/issues?q=is:pr+is:open+review-requested:olafkfreund` | 5 min poll |
| `RecentActivity` | `/users/olafkfreund/events` + follow-up `/repos/X/commits/{head}` per PushEvent | 5 min poll + signals push (Phase D) |
| `OpenIssues` | `/search/issues?q=is:issue+is:open+user:olafkfreund` | 5 min poll |

`RecentActivity` has to follow up because GitHub stopped including
the `commits` array in `PushEvent` payloads — only `head` SHA is
sent. The widget extracts heads from the events feed then parallel-
fetches `/repos/{repo}/commits/{head}` to get the commit message.

## Entity-page tabs (auto-attached via plugin alpha bundles)

| Plugin | Tab | Annotation gate |
|--------|-----|-----------------|
| `@roadiehq/backstage-plugin-github-insights` | "GitHub Insights" | `github.com/project-slug` |
| `@backstage-community/plugin-github-deployments` | Overview card | same |
| `@backstage-community/plugin-github-actions` | "GitHub Actions" | same |
| `@backstage-community/plugin-github-issues` | "GitHub Issues" | same |
| `@backstage-community/plugin-github-pull-requests-board` | "Pull Requests" page | same |

All four community plugins ship `/alpha` bundles and register
themselves automatically when added to `createApp({ features })`.

## Webhook ingestion

Covered in detail in [Events + Webhooks](events.md). Every push,
pull_request, issues, and release event from every olafkfreund repo
lands at `/api/events/http/github`, gets HMAC-validated, and fans out
via the signals bus to any browser tab with the home page open.

## PR-bot workflows

Three GitHub Actions workflows in this repo keep the catalog fresh by
proactively adding missing files to repos:

| Workflow | When | What |
|----------|------|------|
| `catalog-onboard.yml` | Daily 06:17 UTC | Opens PRs adding `catalog-info.yaml` to repos that lack one (batched 10/run) |
| `techdocs-onboard.yml` | Daily 06:37 UTC | Adds `mkdocs.yml` + `docs/index.md` + the techdocs-ref annotation |
| `apis-onboard.yml` | Daily 06:57 UTC | Discovers OpenAPI / AsyncAPI / GraphQL / gRPC specs and registers them as API entities |

All three use `BOT_PAT` (fine-grained PAT with Contents +
PullRequests + Metadata read/write). The exclusion list at
`.github/onboard-exclude.txt` keeps PAT-scoped + categorically
archived/fork/private repos out.
