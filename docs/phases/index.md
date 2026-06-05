# Integration phases

The portal shipped in four discrete phases over a single intense
session. Each phase is one merged epic with its own PR chain in
`olafkfreund/backstage` and corresponding nixos digest bumps in
`olafkfreund/nixos_config`.

| Phase | Scope | Issue | Status |
|-------|-------|-------|--------|
| **A** | Gruvbox theme + Freundcloud logo + JetBrains Mono | [#8](https://github.com/olafkfreund/backstage/issues/8) | Shipped |
| **B** | Wire dormant GitHub plugins (Insights + Deployments) | [#9](https://github.com/olafkfreund/backstage/issues/9) | Shipped |
| **C** | GitLab parity (discovery + scaffolder + UI) | [#10](https://github.com/olafkfreund/backstage/issues/10) | Shipped |
| **D** | Real-time freshness (webhooks → events → signals) | [#11](https://github.com/olafkfreund/backstage/issues/11) | Shipped |

Each phase page has its own architecture diagram, file inventory, and
verification recipe.

## Sequencing rationale

Phases A → D were chosen in order of **risk × visibility**:

- **A** — pure frontend, zero backend risk, instant visual payoff
- **B** — all the plugins were already in `package.json`; just routing
- **C** — agenix secret was already wired, just plugins missing
- **D** — full architectural change (events backend, public webhook
  endpoint via Tailscale Funnel, signals broadcast)

Doing the visible polish first (A) made every subsequent phase look
finished even mid-flight.

## Image bump trail

Each phase shipped via one or more container image bumps. The session
deployed 15 images in total — every Backstage PR triggered a CI
build, and every nixos digest bump shipped the new image to p510:

```
adefc77 → c707f8d → 9082e12 → 4f79f5d → 349d3c10
→ cc024bb3 → 3458fc58 → 149315cd → 14ce8351 → 05cd3f92
→ e22ae753 → 58af6263 → d4107d8f → 3921d610 → 028ca273
```

The cadence forced confidence: every commit had to land cleanly
because the deploy was always one merge away.
