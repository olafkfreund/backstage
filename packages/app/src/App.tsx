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
    gitlabPlugin,
    // All community plugins below ship alpha bundles, so they
    // auto-register their entity tabs / cards / pages with the
    // declarative frontend. Annotation-gating is built in:
    // GitHub plugins activate on github.com/project-slug, the
    // Copilot plugin on github.com/team-slug (org-scoped metrics
    // sit idle for personal accounts but the install is clean).
    githubActionsPlugin,
    githubIssuesPlugin,
    githubPullRequestsBoardPlugin,
    techInsightsPlugin,
    copilotPlugin,
  ],
});
