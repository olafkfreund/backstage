// Custom HomePage replacing the scaffolded "StarredEntities + Toolkit
// + RandomJoke" trio with a richer grid: greeting + world clock,
// starred entities, recently visited, top visited, expanded toolkit,
// catalog search.
//
// Replaces the default `page:home/home` extension by registering one
// with the same id — the new declarative frontend system uses
// last-registration-wins for extension overrides.

import { createFrontendModule, PageBlueprint } from '@backstage/frontend-plugin-api';
import {
  HeaderWorldClock,
  HomePageRecentlyVisited,
  HomePageStarredEntities,
  HomePageToolkit,
  HomePageTopVisited,
  WelcomeTitle,
  type ClockConfig,
  type Tool,
} from '@backstage/plugin-home';
import { Content, Header, Page } from '@backstage/core-components';
import Grid from '@material-ui/core/Grid';

import HomeIcon from '@material-ui/icons/Home';
import ExtensionIcon from '@material-ui/icons/Extension';
import LibraryBooks from '@material-ui/icons/LibraryBooks';
import CreateIcon from '@material-ui/icons/Create';
import AccountTreeIcon from '@material-ui/icons/AccountTree';
import GitHubIcon from '@material-ui/icons/GitHub';
import SecurityIcon from '@material-ui/icons/Security';
import CloudIcon from '@material-ui/icons/Cloud';

import { OrgOpenPrs } from './widgets/OrgOpenPrs';
import { ReviewRequested } from './widgets/ReviewRequested';
import { RecentActivity } from './widgets/RecentActivity';
import { OpenIssues } from './widgets/OpenIssues';

const clockConfigs: ClockConfig[] = [
  { label: 'UTC', timeZone: 'UTC' },
  { label: 'London', timeZone: 'Europe/London' },
];

// Toolkit shortcuts. Edit this list to add/remove quick links.
const tools: Tool[] = [
  {
    label: 'Catalog',
    url: '/catalog',
    icon: <HomeIcon />,
  },
  {
    label: 'APIs',
    url: '/api-docs',
    icon: <ExtensionIcon />,
  },
  {
    label: 'TechDocs',
    url: '/docs',
    icon: <LibraryBooks />,
  },
  {
    label: 'Create',
    url: '/create',
    icon: <CreateIcon />,
  },
  {
    label: 'Catalog Graph',
    url: '/catalog-graph?rootEntityRefs=user:default/olafkfreund&maxDepth=2',
    icon: <AccountTreeIcon />,
  },
  {
    label: 'GitHub',
    url: 'https://github.com/olafkfreund',
    icon: <GitHubIcon />,
  },
  {
    label: 'Security Alerts',
    url: 'https://github.com/olafkfreund?tab=security',
    icon: <SecurityIcon />,
  },
  {
    label: 'Tailscale Admin',
    url: 'https://login.tailscale.com/admin/machines',
    icon: <CloudIcon />,
  },
];

const HomePageContent = () => (
  <Page themeId="home">
    <Header title={<WelcomeTitle />} pageTitleOverride="Home">
      <HeaderWorldClock clockConfigs={clockConfigs} />
    </Header>
    <Content>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <OrgOpenPrs />
        </Grid>
        <Grid item xs={12} md={6}>
          <ReviewRequested />
        </Grid>
        <Grid item xs={12} md={6}>
          <RecentActivity />
        </Grid>
        <Grid item xs={12} md={6}>
          <OpenIssues />
        </Grid>
        <Grid item xs={12} md={6}>
          <HomePageStarredEntities />
        </Grid>
        <Grid item xs={12} md={6}>
          <HomePageRecentlyVisited />
        </Grid>
        <Grid item xs={12} md={6}>
          <HomePageToolkit title="Toolkit" tools={tools} />
        </Grid>
        <Grid item xs={12} md={6}>
          <HomePageTopVisited />
        </Grid>
      </Grid>
    </Content>
  </Page>
);

// Override the default home page by registering an extension at the
// same path. The id `page:home/home` matches what @backstage/plugin-home
// auto-registers via packages:all.
const homePageOverride = PageBlueprint.makeWithOverrides({
  name: 'home',
  factory(originalFactory) {
    return originalFactory({
      path: '/home',
      loader: async () => <HomePageContent />,
    });
  },
});

export const homePageModule = createFrontendModule({
  pluginId: 'home',
  extensions: [homePageOverride],
});
