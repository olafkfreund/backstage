# Plugins

What's installed beyond the scaffolded defaults, why, and how to add more.

## Currently installed

Only the defaults from `@backstage/create-app`. This is intentional — start
minimal, add plugins as concrete needs arise.

The scaffolder ships these out of the box:

- **Software catalog** (`@backstage/plugin-catalog*`) — register and browse
  entities via `catalog-info.yaml` files in your repos
- **Software templates** (`@backstage/plugin-scaffolder*`) — enabled but
  unused; no templates registered yet
- **Search** (`@backstage/plugin-search*`)
- **API docs** (`@backstage/plugin-api-docs`)
- **Auth providers** — GitHub OAuth + guest configured via
  `app-config.production.yaml`
- **GitHub integration** (`@backstage/integration`) — token-based

## Add a plugin

### Frontend plugin

```bash
yarn --cwd packages/app add @backstage/plugin-<name>
```

Then wire the route in `packages/app/src/App.tsx`:

```tsx
import { ExamplePage } from '@backstage/plugin-example';
// ...
<Route path="/example" element={<ExamplePage />} />
```

And add a sidebar item in `packages/app/src/components/Root/Root.tsx`:

```tsx
<SidebarItem icon={LibraryBooks} to="example" text="Example" />
```

### Backend plugin

```bash
yarn --cwd packages/backend add @backstage/plugin-<name>-backend
```

Then add it to `packages/backend/src/index.ts`:

```ts
backend.add(import('@backstage/plugin-example-backend'));
```

### Verify

```bash
yarn dev
```

Both the frontend (`localhost:3000`) and backend (`localhost:7007`) should
boot without errors and the plugin's route/feature should be reachable.

## Plugins likely worth adding next

When the day comes for each, add them one at a time:

- `@backstage/plugin-techdocs` + backend — once you have MkDocs-style docs
  to publish. Needs storage configured (`techdocs.publisher.type`).
- `@backstage/plugin-github-actions` — surfaces CI status from catalog
  entities annotated with their repo
- `@backstage/plugin-kubernetes` — only useful with a real k8s cluster
- `@backstage/plugin-explore` — browse catalog by area/domain; nice with a
  larger catalog

## Plugin upgrade

`yarn backstage-cli versions:bump` upgrades all `@backstage/*` packages to
the latest compatible release. Run after upstream Backstage releases (~every
month). Read the release notes — plugin APIs occasionally shift in major
versions.

## Custom in-house plugins

Created via `yarn new` inside this repo (Backstage CLI scaffolds the
plugin under `plugins/`). Same image lifecycle as bundled plugins — push
to `main` and CI publishes a new image.
