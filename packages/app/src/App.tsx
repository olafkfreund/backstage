import { createApp } from '@backstage/frontend-defaults';
import catalogPlugin from '@backstage/plugin-catalog/alpha';
import { navModule } from './modules/nav';
import { signInPageModule } from './modules/signInPage';
import { homePageModule } from './modules/home';
import { themeModule } from './modules/theme';

// Note: plugin-github-actions / -github-pull-requests / -security-insights
// were tried as entity tabs via EntityContentBlueprint + convertLegacyPlugin
// but they error with "routeRef not discovered" — their legacy
// createRoutableExtension components need a routeRef binding that
// convertLegacyPlugin doesn't auto-supply. Tracked in olafkfreund/backstage#17
// for a follow-up. The GitHub Insights tab + GitHub Deployments card are
// auto-wired by their alpha-bundled plugins via @backstage/plugin-catalog/alpha.

export default createApp({
  features: [
    catalogPlugin,
    navModule,
    signInPageModule,
    homePageModule,
    themeModule,
  ],
});
