# Custom modules

Four module folders under `packages/app/src/modules/` carry every
customization in the portal:

```
modules/
├── home/           — custom HomePage with widgets
│   ├── index.tsx
│   └── widgets/
│       ├── OrgOpenPrs.tsx
│       ├── ReviewRequested.tsx
│       ├── RecentActivity.tsx
│       └── OpenIssues.tsx
├── nav/            — custom sidebar
│   ├── Sidebar.tsx
│   ├── SidebarLogo.tsx
│   ├── LogoFull.tsx
│   └── LogoIcon.tsx
├── signInPage/     — both Guest + GitHub sign-in
│   └── index.tsx
└── theme/          — Gruvbox light + dark
    └── index.tsx
```

## `home`

`PageBlueprint.makeWithOverrides` (no `name`) replaces the default
home page. The `originalFactory` is called with our own `path: '/home'`,
`loader`, `title: 'Home'`, and `icon: <HomeIcon />` (the latter two
are critical — without them the sidebar can't render the Home nav
item — see [Phase A doc](../phases/a-theme-logo.md#follow-up-fix-13)).

The HomePage renders a Material UI Grid with:

1. `OrgOpenPrs` — your own open PRs, oldest first, with per-PR review
   state
2. `ReviewRequested` — PRs waiting on your review
3. `RecentActivity` — last 20 events from your GitHub events feed.
   Subscribes to `useSignal('github:activity')` for instant updates
   (Phase D)
4. `OpenIssues` — issues assigned to you, oldest first
5. `HomePageStarredEntities` (from plugin-home)
6. `HomePageToolkit` with 8 shortcuts (Catalog, APIs, TechDocs, Create,
   Catalog Graph, GitHub, Security Alerts, Tailscale Admin)

Each widget caps at 10 items, refreshes every 5 minutes via
`setInterval`, and gracefully handles auth + error states.

## `nav`

`NavContentBlueprint.make` lets us own the entire sidebar component
function. We `nav.take('page:catalog')`, `nav.take('page:scaffolder')`,
etc to pull specific items into specific groups, and `nav.rest({
sortBy: 'title' })` to dump the rest into a scroll wrapper.

Home is pinned explicitly with `<SidebarItem icon={HomeIcon}
to="/home" text="Home" />` at the top of the Menu group — plugin-home
doesn't register a NavItemBlueprint at all so relying on automatic
page→nav conversion is fragile.

`Catalog Graph` href is rewritten on the fly to deep-link with
`?rootEntityRefs[]=group%3Adefault%2Folafkfreund&maxDepth=2`. The
`qs` parser used by the page only reads `rootEntityRefs` when it's
already an array, so the bracket syntax is required, not optional.

## `signInPage`

`SignInPageBlueprint` with both `guest` and `github` providers. The
GitHub provider uses `usernameMatchingUserEntityName` resolver so
the GitHub login name matches a seed `User` entity in
`olafkfreund/nixos_config/catalog-info.yaml`.

## `theme`

`ThemeBlueprint.make({ name, params: { theme: AppTheme } })` once for
`gruvbox-dark` and once for `gruvbox-light`. Both call
`createUnifiedTheme()` with the full Backstage-extended palette
(navigation, status, banner, bursts, etc).

Theme switching lives in the user settings page — Backstage stores
the active theme in `localStorage` so it persists per browser.
