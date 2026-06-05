# Phase A — Gruvbox theme + Freundcloud logo

**Issue:** [#8](https://github.com/olafkfreund/backstage/issues/8)
**PR:** [#12](https://github.com/olafkfreund/backstage/pull/12) + follow-up [#13](https://github.com/olafkfreund/backstage/pull/13) for the Home sidebar item
**Image digest:** `sha256:349d3c10…` (tag `sha-5c3aa59`)

## Goal

Make Backstage look like the rest of the freundcloud universe instead
of Spotify's default. Concretely:

- Two Gruvbox themes (Dark default, Light toggle) selectable from
  user settings
- Custom cloud + sine-wave logo replacing the Spotify spaghetti
  squiggle
- Monospace typography (JetBrains Mono) across the UI to match a
  terminal-first dev environment

## Files

| Path | Role |
|------|------|
| `packages/app/src/modules/theme/index.tsx` | New: two `ThemeBlueprint.make()` entries (gruvbox-dark, gruvbox-light) with full Backstage palette extension |
| `packages/app/src/modules/nav/LogoIcon.tsx` | Replaced: cloud + wave SVG using `currentColor` |
| `packages/app/src/modules/nav/LogoFull.tsx` | Replaced: icon + JetBrains Mono "freundcloud" wordmark |
| `packages/app/src/App.tsx` | +1 feature: `themeModule` |

The logos use `fill: currentColor` so they inherit the active theme's
text color without per-theme variants — drop in any future theme and
the logo follows automatically.

## Palette

The Gruvbox palette is encoded once in `packages/app/src/modules/theme/index.tsx`:

```ts
const gruvbox = {
  dark: { bg0: '#1d2021', bg1: '#282828', bg2: '#32302f', /* ... */ },
  light: { bg0: '#f9f5d7', bg1: '#fbf1c7', bg2: '#f2e5bc', /* ... */ },
  accent: {
    orange: '#fe8019', aqua: '#8ec07c', aquaDark: '#458588',
    red: '#fb4934', green: '#b8bb26', yellow: '#fabd2f',
    blue: '#83a598', purple: '#d3869b',
  },
};
```

`createUnifiedTheme()` from `@backstage/theme` accepts the
Backstage-extended palette directly — no MUI v4 hack required. The
extension covers `navigation`, `status`, `banner`, `bursts`,
`pinSidebarButton`, and `tabbar` so every surface of the UI picks up
the theme cleanly.

## Verification

After deploy, navigate to Settings → Theme picker → confirm both
"Gruvbox Dark" + "Gruvbox Light" appear with sun/moon icons. Switch
between them; check Catalog, /create, and an entity page for
contrast issues.

## Follow-up fix (#13)

The first cut accidentally dropped the **Home** item from the left
sidebar. Root cause: `@backstage/plugin-home` doesn't register a
`NavItemBlueprint` extension — the page extension is the only thing
the sidebar reads — and my homePage override forgot to pass `title`
- `icon` through to `originalFactory`. Without those props the nav
reader couldn't build a sidebar item. The fix in PR #13 adds an
explicit `<SidebarItem icon={HomeIcon} to="/home" text="Home" />` in
`Sidebar.tsx` so the item is always pinned at the top of the Menu
group regardless of plugin-version drift.
