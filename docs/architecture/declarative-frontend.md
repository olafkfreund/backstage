# Declarative Frontend

`packages/app/src/App.tsx` is the entire frontend root:

```tsx
import { createApp } from '@backstage/frontend-defaults';
import catalogPlugin from '@backstage/plugin-catalog/alpha';
import { navModule } from './modules/nav';
import { signInPageModule } from './modules/signInPage';
import { homePageModule } from './modules/home';
import { themeModule } from './modules/theme';
import gitlabPlugin from '@immobiliarelabs/backstage-plugin-gitlab/alpha';
import githubActionsPlugin from '@backstage-community/plugin-github-actions/alpha';
import githubIssuesPlugin from '@backstage-community/plugin-github-issues/alpha';
import githubPullRequestsBoardPlugin from '@backstage-community/plugin-github-pull-requests-board/alpha';
import techInsightsPlugin from '@backstage-community/plugin-tech-insights/alpha';
import copilotPlugin from '@backstage-community/plugin-copilot/alpha';

export default createApp({
  features: [
    catalogPlugin,
    navModule,
    signInPageModule,
    homePageModule,
    themeModule,
    gitlabPlugin,
    githubActionsPlugin,
    githubIssuesPlugin,
    githubPullRequestsBoardPlugin,
    techInsightsPlugin,
    copilotPlugin,
  ],
});
```

That's the whole app. Every page, every entity tab, every sidebar
item, every theme — composed from these 12 features.

## How features compose

Each entry in `features` is one of:

- A **FrontendPlugin** — from `createFrontendPlugin({ pluginId,
  extensions })`. Brings its own set of extensions (pages, cards,
  APIs, nav items). Most third-party plugins are this.
- A **FrontendModule** — from `createFrontendModule({ pluginId,
  extensions })`. Adds OR overrides extensions belonging to another
  plugin. The four `modules/*/index.ts` files in this repo use this
  pattern to override the default home page, sidebar, sign-in page,
  and theme set.

Plugins / modules are composed in order; **later entries override
earlier ones with the same extension id**. That's why
`homePageModule` (declaring `pluginId: 'home'` with a
`PageBlueprint.makeWithOverrides`) replaces the default home page —
they collide on the same id, and last-write-wins.

## How extensions register

Each extension `kind` has a fixed mount-point:

| Kind | Mount point |
|------|-------------|
| `page` | `app/routes` input `routes` |
| `nav-content` | `app/nav` input `content` |
| `nav-item` | `app/nav` input `items` |
| `entity-content` | `page:catalog/entity` input `contents` |
| `entity-card` | `page:catalog/entity` input `cards` |
| `theme` | `api:app/app-theme` input `themes` |
| `api` | `app/apis` input |
| `app-root-element` | `app/root` input `elements` |

Knowing the mount point makes overrides predictable. Want to add an
entity tab? Write an `EntityContentBlueprint.make({ ... })` and it
shows up. Want to swap the home page? `PageBlueprint.makeWithOverrides`
with `pluginId: 'home'`, no `name` — id matches the default page and
overrides it.

## The `name` gotcha (Phase A follow-up)

Two extensions with the same `(kind, pluginId, name)` collide and
last-wins. Two extensions with the same `(kind, pluginId)` but
DIFFERENT names register as DIFFERENT extensions, both with the same
default `attachTo`, both fighting for the same path.

The original home page override declared `name: 'home'`, producing
id `page:home/home`. The default plugin-home page registers WITHOUT
a name, producing id `page:home` (no slash). Different ids → both
registered → both attached to `/home` → React Router resolved to
whichever was first → the default won → my custom HomePage never
rendered. Dropping `name: 'home'` from the override made the ids
match. Fixed in PR #3 during Phase A.
