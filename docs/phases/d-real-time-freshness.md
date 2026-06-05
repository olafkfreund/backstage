# Phase D — Real-time freshness

**Issue:** [#11](https://github.com/olafkfreund/backstage/issues/11)
**PRs:** [#22](https://github.com/olafkfreund/backstage/pull/22), [#23](https://github.com/olafkfreund/backstage/pull/23)
**Image digest:** `sha256:3921d610…` (tag `sha-98ed906`)

## Goal

Kill the 5-minute home-widget polling cycle and the 60-minute
catalog discovery cycle. Push events from GitHub → events backend →
signals → widgets so updates land in under a second.

## Architecture

```
                 https://bs.freundcloud.com:8443/api/events/http/github
GitHub webhooks ───────────────────────────────────────────────────────►
                              ↓ Tailscale Funnel (only the events path)
                          localhost:7007
                              ↓
                  @backstage/plugin-events-backend-module-github
                              │  HMAC-SHA256 validate
                              │  (GITHUB_WEBHOOK_SECRET from agenix)
                              ↓
                  events bus topic: `github`
                              │
                              ├──► signalsGithubBridge subscriber
                              │      │ logs "rebroadcasting <event>"
                              │      ↓
                              │   signals channel: `github:activity`
                              │      │ broadcast to every connected client
                              │      ↓
                              │   useSignal('github:activity') in
                              │   RecentActivity widget → re-fetch
                              │
                              └──► (future: catalogRefreshOnPush)
```

## Files

| Path | Role |
|------|------|
| `packages/backend/src/index.ts` | +`events-backend`, +`events-backend-module-github`, +`signalsGithubBridge` module |
| `packages/backend/src/modules/signalsGithubBridge.ts` | New: ~50 line `createBackendModule` that subscribes to `github` topic and publishes to `github:activity` |
| `packages/app/src/modules/home/widgets/RecentActivity.tsx` | `useSignal('github:activity')` added alongside existing 5-min poll |
| `app-config.production.yaml` | `events.http.topics: [github]` + `webhookSecret: ${GITHUB_WEBHOOK_SECRET:-}` (with `:-` fallback so boot doesn't break) |

## Secret + bridge

`secrets/backstage-github-webhook-secret.age` — 64 hex chars from
`openssl rand -hex 32`, agenix-encrypted, decrypted by p510 at
activation. The `backstage-env-setup.service` oneshot in
`modules/services/backstage.nix` reads the file and writes
`GITHUB_WEBHOOK_SECRET=<value>` into `/run/backstage/env-backstage`
which `podman-backstage.service` loads via `EnvironmentFile=`.

## Tailscale Funnel binding

Funnel is per-port, not per-path. Port 443 is already saturated with
tailnet-only Serve mappings for Plex / Sonarr / Radarr / Lidarr /
Prowlarr / Backstage UI / etc — funneling 443 would expose every one
of those publicly. **Port 8443 is dedicated to the single webhook
path:**

```nix
tailscale funnel --bg --https=8443 \
  --set-path=/api/events/http/github \
  http://localhost:7007/api/events/http/github
```

The target URL includes the path because Tailscale's `--set-path`
**strips** the matched prefix when forwarding. A bare
`http://localhost:7007` target would send `:8443/api/events/http/github`
inbound to `localhost:7007/` (the React app root) → 404. Spelling
the path out twice tells Tailscale to keep it.

## Webhook registration

Batch-registered across all 69 non-archived olafkfreund repos via a
single shell loop:

```bash
SECRET=$(agenix -d secrets/backstage-github-webhook-secret.age)
URL="https://p510.tail833f7.ts.net:8443/api/events/http/github"
while read REPO; do
  gh api -X POST "/repos/olafkfreund/$REPO/hooks" \
    -F "events[]=push" -F "events[]=pull_request" \
    -F "events[]=issues" -F "events[]=release" \
    -F "config[url]=$URL" -F "config[secret]=$SECRET" \
    --silent
done < repos.txt
```

68 created + 1 already existed (nixos_config from the initial
smoke test) + 0 failures.

## Verification

Two smoke tests via disposable issue creates against `nixos_config`:

```
22:38:08  signals/github-bridge: subscribed to github topic,
          will publish to channel github:activity
22:38:21  signals/github-bridge: rebroadcasting issues from
          olafkfreund/nixos_config
22:38:21  "POST /api/events/http/github" 202 21
          "GitHub-Hookshot/5af8f1d"
```

Bridge fires within milliseconds of GitHub's webhook delivery. The
RecentActivity home widget calls `useSignal('github:activity')` and
re-fetches `/users/olafkfreund/events` on every notification —
the rendered list updates without a manual reload.

The 5-minute `setInterval` poll is **kept as a fallback** so the
widget still updates if the WebSocket loses connection. Hook returns
`{ isSignalsAvailable: false }` in that case and the polling-only
path keeps the data fresh.
