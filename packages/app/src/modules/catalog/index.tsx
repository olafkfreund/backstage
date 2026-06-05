// Per-entity tabs sourced from legacy plugins. `compatWrapper` alone
// isn't enough — the plugins use internal routeRefs for sub-routing
// (e.g. drilling into a workflow run), and those refs aren't
// registered with the app router unless you go through
// `convertLegacyPlugin`, which auto-converts the plugin's getApis(),
// routes, and externalRoutes into declarative-frontend equivalents.
//
// Each plugin becomes its own FrontendPlugin entry in App.tsx
// features, carrying an entity-content extension that filters by the
// github.com/project-slug annotation.

import { convertLegacyPlugin } from '@backstage/core-compat-api';
import { EntityContentBlueprint } from '@backstage/plugin-catalog-react/alpha';

import {
  githubActionsPlugin,
  EntityGithubActionsContent,
} from '@backstage/plugin-github-actions';
import {
  githubInsightsPlugin,
  EntityGithubInsightsContent,
} from '@roadiehq/backstage-plugin-github-insights';
import {
  githubPullRequestsPlugin,
  EntityGithubPullRequestsContent,
} from '@roadiehq/backstage-plugin-github-pull-requests';
import {
  securityInsightsPlugin,
  EntitySecurityInsightsContent,
} from '@roadiehq/backstage-plugin-security-insights';

const GITHUB_FILTER = 'metadata.annotations["github.com/project-slug"]';

const githubActionsEntityContent = EntityContentBlueprint.make({
  name: 'github-actions',
  params: {
    path: 'github-actions',
    title: 'Actions',
    filter: GITHUB_FILTER,
    loader: () => Promise.resolve(<EntityGithubActionsContent />),
  },
});

const githubInsightsEntityContent = EntityContentBlueprint.make({
  name: 'github-insights',
  params: {
    path: 'github-insights-tab',
    title: 'Repo Insights',
    filter: GITHUB_FILTER,
    loader: () => Promise.resolve(<EntityGithubInsightsContent />),
  },
});

const githubPullRequestsEntityContent = EntityContentBlueprint.make({
  name: 'github-pull-requests',
  params: {
    path: 'github-pull-requests',
    title: 'Pull Requests',
    filter: GITHUB_FILTER,
    loader: () => Promise.resolve(<EntityGithubPullRequestsContent />),
  },
});

const securityInsightsEntityContent = EntityContentBlueprint.make({
  name: 'security-insights',
  params: {
    path: 'security',
    title: 'Security',
    filter: GITHUB_FILTER,
    loader: () => Promise.resolve(<EntitySecurityInsightsContent />),
  },
});

export const githubActionsConvertedPlugin = convertLegacyPlugin(
  githubActionsPlugin,
  { extensions: [githubActionsEntityContent] },
);

export const githubInsightsConvertedPlugin = convertLegacyPlugin(
  githubInsightsPlugin,
  { extensions: [githubInsightsEntityContent] },
);

export const githubPullRequestsConvertedPlugin = convertLegacyPlugin(
  githubPullRequestsPlugin,
  { extensions: [githubPullRequestsEntityContent] },
);

export const securityInsightsConvertedPlugin = convertLegacyPlugin(
  securityInsightsPlugin,
  { extensions: [securityInsightsEntityContent] },
);
