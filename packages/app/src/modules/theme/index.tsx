import { createFrontendModule } from '@backstage/frontend-plugin-api';
import { ThemeBlueprint } from '@backstage/plugin-app-react';
import {
  UnifiedThemeProvider,
  createUnifiedTheme,
  type UnifiedTheme,
} from '@backstage/theme';
import DarkIcon from '@material-ui/icons/Brightness2';
import LightIcon from '@material-ui/icons/Brightness7';

// Gruvbox palette — Pat Brisbin's classic plus Tomas Sallinen "Material" tweaks.
// https://github.com/morhetz/gruvbox
const gruvbox = {
  dark: {
    bg0: '#1d2021', // hard
    bg1: '#282828', // default surface
    bg2: '#32302f', // soft / cards
    bg3: '#3c3836', // dividers
    fg0: '#fbf1c7',
    fg1: '#ebdbb2', // default text
    fg2: '#d5c4a1',
  },
  light: {
    bg0: '#f9f5d7', // hard
    bg1: '#fbf1c7', // default surface
    bg2: '#f2e5bc', // soft / cards
    bg3: '#ebdbb2', // dividers
    fg0: '#282828',
    fg1: '#3c3836', // default text
    fg2: '#504945',
  },
  accent: {
    orange: '#fe8019', // primary
    aqua: '#8ec07c', // dark secondary
    aquaDark: '#458588', // light secondary
    red: '#fb4934',
    green: '#b8bb26',
    yellow: '#fabd2f',
    blue: '#83a598',
    purple: '#d3869b',
  },
};

const buildGruvboxDark = (): UnifiedTheme =>
  createUnifiedTheme({
    palette: {
      type: 'dark',
      background: {
        default: gruvbox.dark.bg1,
        paper: gruvbox.dark.bg2,
      },
      primary: {
        main: gruvbox.accent.orange,
        contrastText: gruvbox.dark.bg0,
      },
      secondary: {
        main: gruvbox.accent.aqua,
        contrastText: gruvbox.dark.bg0,
      },
      error: { main: gruvbox.accent.red },
      warning: { main: gruvbox.accent.yellow },
      info: { main: gruvbox.accent.blue },
      success: { main: gruvbox.accent.green },
      text: {
        primary: gruvbox.dark.fg1,
        secondary: gruvbox.dark.fg2,
      },
      divider: gruvbox.dark.bg3,
      // Backstage-specific palette extensions surfaced through MUI's V4 theme.
      // The `navigation` / `banner` / `status` blocks come from
      // @backstage/theme — referencing them through Material-UI's `palette`
      // catch-all keeps types happy without importing the v0.x palette types.
      navigation: {
        background: gruvbox.dark.bg0,
        indicator: gruvbox.accent.orange,
        color: gruvbox.dark.fg1,
        selectedColor: gruvbox.accent.orange,
        navItem: { hoverBackground: gruvbox.dark.bg3 },
        submenu: { background: gruvbox.dark.bg1 },
      },
      status: {
        ok: gruvbox.accent.green,
        warning: gruvbox.accent.yellow,
        error: gruvbox.accent.red,
        pending: gruvbox.accent.aqua,
        running: gruvbox.accent.blue,
        aborted: gruvbox.dark.fg2,
      },
      banner: {
        info: gruvbox.accent.aqua,
        warning: gruvbox.accent.yellow,
        error: gruvbox.accent.red,
        text: gruvbox.dark.fg1,
        link: gruvbox.accent.orange,
        closeButtonColor: gruvbox.dark.fg2,
      },
      border: gruvbox.dark.bg3,
      textContrast: gruvbox.dark.fg0,
      textVerySubtle: gruvbox.dark.fg2,
      textSubtle: gruvbox.dark.fg2,
      highlight: gruvbox.accent.orange,
      errorBackground: '#5b1d1c',
      warningBackground: '#5b4a1c',
      infoBackground: '#1c3845',
      errorText: gruvbox.accent.red,
      infoText: gruvbox.accent.aqua,
      warningText: gruvbox.accent.yellow,
      linkHover: gruvbox.accent.yellow,
      link: gruvbox.accent.aqua,
      gold: gruvbox.accent.yellow,
      bursts: {
        fontColor: gruvbox.dark.bg0,
        slackChannelText: gruvbox.dark.bg0,
        backgroundColor: { default: gruvbox.accent.orange },
        gradient: { linear: 'linear-gradient(-137deg, #fe8019 0%, #d65d0e 100%)' },
      },
      pinSidebarButton: {
        icon: gruvbox.dark.fg2,
        background: gruvbox.dark.bg3,
      },
      tabbar: {
        indicator: gruvbox.accent.orange,
      },
    },
    defaultPageTheme: 'home',
    fontFamily:
      '"JetBrains Mono", "Fira Code", "SF Mono", Menlo, Consolas, monospace',
  });

const buildGruvboxLight = (): UnifiedTheme =>
  createUnifiedTheme({
    palette: {
      type: 'light',
      background: {
        default: gruvbox.light.bg1,
        paper: gruvbox.light.bg2,
      },
      primary: {
        main: gruvbox.accent.orange,
        contrastText: gruvbox.light.bg0,
      },
      secondary: {
        main: gruvbox.accent.aquaDark,
        contrastText: gruvbox.light.bg0,
      },
      error: { main: gruvbox.accent.red },
      warning: { main: '#b57614' },
      info: { main: gruvbox.accent.aquaDark },
      success: { main: '#79740e' },
      text: {
        primary: gruvbox.light.fg1,
        secondary: gruvbox.light.fg2,
      },
      divider: gruvbox.light.bg3,
      navigation: {
        background: gruvbox.light.bg0,
        indicator: gruvbox.accent.orange,
        color: gruvbox.light.fg1,
        selectedColor: gruvbox.accent.orange,
        navItem: { hoverBackground: gruvbox.light.bg3 },
        submenu: { background: gruvbox.light.bg1 },
      },
      status: {
        ok: '#79740e',
        warning: '#b57614',
        error: gruvbox.accent.red,
        pending: gruvbox.accent.aquaDark,
        running: gruvbox.accent.blue,
        aborted: gruvbox.light.fg2,
      },
      banner: {
        info: gruvbox.accent.aquaDark,
        warning: '#b57614',
        error: gruvbox.accent.red,
        text: gruvbox.light.fg1,
        link: gruvbox.accent.orange,
        closeButtonColor: gruvbox.light.fg2,
      },
      border: gruvbox.light.bg3,
      textContrast: gruvbox.light.fg0,
      textVerySubtle: gruvbox.light.fg2,
      textSubtle: gruvbox.light.fg2,
      highlight: gruvbox.accent.orange,
      errorBackground: '#fde6e1',
      warningBackground: '#fff5d2',
      infoBackground: '#e1ecf2',
      errorText: '#9d0006',
      infoText: gruvbox.accent.aquaDark,
      warningText: '#b57614',
      linkHover: gruvbox.accent.orange,
      link: gruvbox.accent.aquaDark,
      gold: '#b57614',
      bursts: {
        fontColor: gruvbox.light.bg0,
        slackChannelText: gruvbox.light.bg0,
        backgroundColor: { default: gruvbox.accent.orange },
        gradient: { linear: 'linear-gradient(-137deg, #fe8019 0%, #d65d0e 100%)' },
      },
      pinSidebarButton: {
        icon: gruvbox.light.fg2,
        background: gruvbox.light.bg3,
      },
      tabbar: {
        indicator: gruvbox.accent.orange,
      },
    },
    defaultPageTheme: 'home',
    fontFamily:
      '"JetBrains Mono", "Fira Code", "SF Mono", Menlo, Consolas, monospace',
  });

const gruvboxDarkExtension = ThemeBlueprint.make({
  name: 'gruvbox-dark',
  params: {
    theme: {
      id: 'gruvbox-dark',
      title: 'Gruvbox Dark',
      variant: 'dark',
      icon: <DarkIcon />,
      Provider: ({ children }) => (
        <UnifiedThemeProvider theme={buildGruvboxDark()} children={children} />
      ),
    },
  },
});

const gruvboxLightExtension = ThemeBlueprint.make({
  name: 'gruvbox-light',
  params: {
    theme: {
      id: 'gruvbox-light',
      title: 'Gruvbox Light',
      variant: 'light',
      icon: <LightIcon />,
      Provider: ({ children }) => (
        <UnifiedThemeProvider theme={buildGruvboxLight()} children={children} />
      ),
    },
  },
});

export const themeModule = createFrontendModule({
  pluginId: 'app',
  extensions: [gruvboxDarkExtension, gruvboxLightExtension],
});
