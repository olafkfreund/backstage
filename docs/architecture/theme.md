# Theme system

Two named themes registered via `ThemeBlueprint.make()` in
`packages/app/src/modules/theme/index.tsx`:

- `gruvbox-dark` (default)
- `gruvbox-light` (toggle)

## Palette

```ts
const gruvbox = {
  dark: {
    bg0: '#1d2021',  // hard
    bg1: '#282828',  // default surface
    bg2: '#32302f',  // soft / cards
    bg3: '#3c3836',  // dividers
    fg0: '#fbf1c7',
    fg1: '#ebdbb2',  // default text
    fg2: '#d5c4a1',
  },
  light: {
    bg0: '#f9f5d7',
    bg1: '#fbf1c7',
    bg2: '#f2e5bc',
    bg3: '#ebdbb2',
    fg0: '#282828',
    fg1: '#3c3836',
    fg2: '#504945',
  },
  accent: {
    orange:   '#fe8019',  // primary
    aqua:     '#8ec07c',  // secondary (dark)
    aquaDark: '#458588',  // secondary (light)
    red:      '#fb4934',
    green:    '#b8bb26',
    yellow:   '#fabd2f',
    blue:     '#83a598',
    purple:   '#d3869b',
  },
};
```

## Backstage palette extension

`createUnifiedTheme()` accepts the full Backstage-extended palette,
not just MUI's. The dark theme registers all of these:

| Field | Value |
|-------|-------|
| `palette.primary.main` | accent.orange (`#fe8019`) |
| `palette.secondary.main` | accent.aqua (`#8ec07c`) |
| `palette.background.default` | dark.bg1 (`#282828`) |
| `palette.background.paper` | dark.bg2 (`#32302f`) |
| `palette.navigation.*` | sidebar bg + selected color |
| `palette.status.*` | ok/warning/error/pending/running indicators |
| `palette.banner.*` | info/warning/error banners |
| `palette.bursts.*` | header gradient (uses orange) |
| `palette.pinSidebarButton.*` | pin button colors |
| `palette.tabbar.indicator` | tab underline |

The orange (`#fe8019`) shows up consistently across primary buttons,
tab indicators, header bursts, sidebar selected state, REVIEW
PENDING chips, and the "ACTIVE" status pill on the GitHub
Deployments card.

## Font stack

```
"JetBrains Mono", "Fira Code", "SF Mono", Menlo, Consolas, monospace
```

Set at the theme level so it applies to body text, sidebar items,
table cells — everything. Headings and code use the same family,
giving the portal a strong terminal-first identity.

## The logo

`packages/app/src/modules/nav/LogoIcon.tsx` and `LogoFull.tsx` use
`fill: currentColor` and a thin stroke wave. That lets the SVG
inherit the active theme's foreground color (`palette.text.primary`)
on whichever bg the sidebar paints — bright cream on dark, near-black
on light — without needing a per-theme SVG variant.

## Adding a new theme

```tsx
const newThemeExtension = ThemeBlueprint.make({
  name: 'my-theme',
  params: {
    theme: {
      id: 'my-theme',
      title: 'My Theme',
      variant: 'dark',
      icon: <SomeIcon />,
      Provider: ({ children }) => (
        <UnifiedThemeProvider
          theme={createUnifiedTheme({ palette: { /* ... */ } })}
          children={children}
        />
      ),
    },
  },
});

export const themeModule = createFrontendModule({
  pluginId: 'app',
  extensions: [
    gruvboxDarkExtension,
    gruvboxLightExtension,
    newThemeExtension,
  ],
});
```

Drop in, deploy, the theme appears in Settings → Theme picker
automatically. No further wiring.
