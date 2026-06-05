// Per-entity tabs sourced from plugins that ship in package.json but
// don't auto-register themselves in the declarative frontend. We use
// EntityContentBlueprint to attach each one to the entity page tabs
// input, gated by the github.com/project-slug annotation so the tab
// only shows on entities backed by a GitHub repo.

import { createFrontendModule } from '@backstage/frontend-plugin-api';
import { EntityContentBlueprint } from '@backstage/plugin-catalog-react/alpha';
import { compatWrapper } from '@backstage/core-compat-api';

const githubActionsContent = EntityContentBlueprint.make({
  name: 'github-actions',
  params: {
    path: 'github-actions',
    title: 'Actions',
    group: 'ci-cd',
    filter: 'metadata.annotations["github.com/project-slug"]',
    loader: () =>
      import('@backstage/plugin-github-actions').then(m =>
        compatWrapper(<m.EntityGithubActionsContent />),
      ),
  },
});

const githubInsightsContent = EntityContentBlueprint.make({
  name: 'github-insights',
  params: {
    path: 'github-insights',
    title: 'Insights',
    group: 'github',
    filter: 'metadata.annotations["github.com/project-slug"]',
    loader: () =>
      import('@roadiehq/backstage-plugin-github-insights').then(m =>
        compatWrapper(<m.EntityGithubInsightsContent />),
      ),
  },
});

const githubPullRequestsContent = EntityContentBlueprint.make({
  name: 'github-pull-requests',
  params: {
    path: 'github-pull-requests',
    title: 'Pull requests',
    group: 'github',
    filter: 'metadata.annotations["github.com/project-slug"]',
    loader: () =>
      import('@roadiehq/backstage-plugin-github-pull-requests').then(m =>
        compatWrapper(<m.EntityGithubPullRequestsContent />),
      ),
  },
});

const securityInsightsContent = EntityContentBlueprint.make({
  name: 'security-insights',
  params: {
    path: 'security',
    title: 'Security',
    group: 'github',
    filter: 'metadata.annotations["github.com/project-slug"]',
    loader: () =>
      import('@roadiehq/backstage-plugin-security-insights').then(m =>
        compatWrapper(<m.EntitySecurityInsightsContent />),
      ),
  },
});

export const catalogModule = createFrontendModule({
  pluginId: 'catalog',
  extensions: [
    githubActionsContent,
    githubInsightsContent,
    githubPullRequestsContent,
    securityInsightsContent,
  ],
});
