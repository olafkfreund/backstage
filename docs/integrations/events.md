# Events + Webhooks

See [Phase D](../phases/d-real-time-freshness.md) for the full
architecture diagram. This page is the operations cheat sheet.

## Endpoints

| Path | Purpose | Auth | Reachability |
|------|---------|------|--------------|
| `POST /api/events/http/github` | GitHub webhook ingestion | HMAC-SHA256 via `X-Hub-Signature-256` | Public via Tailscale Funnel on **port 8443** |
| `GET /api/events/bus/v1/...` | Internal events-bus REST (used by subscribers) | None (internal) | Tailnet only |

## Public URL

```
https://p510.tail833f7.ts.net:8443/api/events/http/github
```

CNAME alias `bs.freundcloud.com` resolves to the same host but the
Tailscale TLS cert only covers `*.tail833f7.ts.net` — the CNAME
URL hits a TLS SNI mismatch. Use the tail833f7 URL until a separate
cert covers `bs.freundcloud.com` (out of scope for now).

## Rotating the webhook secret

The secret is a single agenix file. Rotation flow:

```bash
# 1. New random value, in-place re-encrypt
cd ~/.config/nixos
openssl rand -hex 32 | agenix -e secrets/backstage-github-webhook-secret.age

# 2. Commit + push + deploy nixos
git add secrets/backstage-github-webhook-secret.age
git commit -m "rotate(secret): backstage-github-webhook-secret"
git push  # auto-deploys via flake

# 3. Re-register all 69 repo webhooks with the new secret
NEW=$(agenix -d secrets/backstage-github-webhook-secret.age)
URL=https://p510.tail833f7.ts.net:8443/api/events/http/github
gh repo list olafkfreund --limit 200 --json name --jq '.[].name' | while read REPO; do
  HOOK_ID=$(gh api "/repos/olafkfreund/$REPO/hooks" \
    --jq "[.[] | select(.config.url==\"$URL\")] | .[0].id")
  [ -n "$HOOK_ID" ] && \
    gh api -X PATCH "/repos/olafkfreund/$REPO/hooks/$HOOK_ID" \
      -F "config[secret]=$NEW" --silent
done
```

## Bridge subscriber: signals

`packages/backend/src/modules/signalsGithubBridge.ts` subscribes to
the `github` topic and republishes to the `github:activity` signals
broadcast channel. The frontend reads via `useSignal('github:activity')`.

Adding another subscriber is the same shape:

```ts
import { createBackendModule, coreServices } from '@backstage/backend-plugin-api';
import { eventsServiceRef } from '@backstage/plugin-events-node';

export const myGithubSubscriber = createBackendModule({
  pluginId: 'my-plugin',
  moduleId: 'github-subscriber',
  register(reg) {
    reg.registerInit({
      deps: { events: eventsServiceRef, logger: coreServices.logger },
      async init({ events, logger }) {
        await events.subscribe({
          id: 'my-subscriber-unique-id',
          topics: ['github'],
          async onEvent(params) {
            const eventType = params.metadata?.['x-github-event'];
            logger.info(`got ${eventType}`);
            // your business logic
          },
        });
      },
    });
  },
});
```

Then `backend.add(myGithubSubscriber)` in `packages/backend/src/index.ts`.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| 403 on every webhook | Secret mismatch between agenix value and GitHub config | Re-extract the agenix value and `PATCH` the webhook's `config[secret]` |
| 404 on POST | Tailscale `--set-path` stripping (regression) | Confirm target URL in funnel includes path: `http://localhost:7007/api/events/http/github` |
| Container fails to boot | Env file missing `GITHUB_WEBHOOK_SECRET=` | The `:-` fallback should prevent this; verify env-setup.service started |
| Bridge subscribed but no `rebroadcasting` log | Log level set above `info` | Bridge logs at `info` since the post-Phase-D bump |
