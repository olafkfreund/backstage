import {
  Sidebar,
  SidebarDivider,
  SidebarGroup,
  SidebarItem,
  SidebarScrollWrapper,
  SidebarSpace,
} from '@backstage/core-components';
import { NavContentBlueprint } from '@backstage/plugin-app-react';
import { SidebarLogo } from './SidebarLogo';
import HomeIcon from '@material-ui/icons/Home';
import MenuIcon from '@material-ui/icons/Menu';
import SearchIcon from '@material-ui/icons/Search';
import { SidebarSearchModal } from '@backstage/plugin-search';
import { UserSettingsSignInAvatar } from '@backstage/plugin-user-settings';
import { NotificationsSidebarItem } from '@backstage/plugin-notifications';

export const SidebarContent = NavContentBlueprint.make({
  params: {
    component: ({ navItems }) => {
      // Deep-link Catalog Graph to a default root entity. The catalog-graph
      // page uses `qs` to parse, and only reads `rootEntityRefs` if it's
      // already an array — so the URL must use the `?key[]=value` form,
      // NOT `?key=value` (which parses as a string and gets ignored).
      // Pick a Group ref because Group is in the default kinds filter
      // (User isn't always) and "group:default/olafkfreund" owns 79
      // components, so the graph populates richly at maxDepth=2.
      const CATALOG_GRAPH_HREF = `/catalog-graph?rootEntityRefs%5B%5D=${encodeURIComponent(
        'group:default/olafkfreund',
      )}&maxDepth=2`;

      const nav = navItems.withComponent(item => (
        <SidebarItem
          icon={() => item.icon}
          to={item.href === '/catalog-graph' ? CATALOG_GRAPH_HREF : item.href}
          text={item.title}
        />
      ));

      // Skipped items
      nav.take('page:search'); // Using search modal instead
      // Take page:home out of nav.rest() so it doesn't appear twice; we
      // render an explicit SidebarItem below to guarantee it's visible
      // (plugin-home doesn't register a NavItemBlueprint, so relying on
      // nav.rest() to surface it is fragile across plugin versions).
      nav.take('page:home');

      return (
        <Sidebar>
          <SidebarLogo />
          <SidebarGroup label="Search" icon={<SearchIcon />} to="/search">
            <SidebarSearchModal />
          </SidebarGroup>
          <SidebarDivider />
          <SidebarGroup label="Menu" icon={<MenuIcon />}>
            <SidebarItem icon={HomeIcon} to="/home" text="Home" />
            {nav.take('page:catalog')}
            {nav.take('page:scaffolder')}
            <SidebarDivider />
            <SidebarScrollWrapper>
              {nav.rest({ sortBy: 'title' })}
            </SidebarScrollWrapper>
          </SidebarGroup>
          <SidebarSpace />
          <SidebarDivider />
          <NotificationsSidebarItem />
          <SidebarDivider />
          <SidebarGroup
            label="Settings"
            icon={<UserSettingsSignInAvatar />}
            to="/settings"
          >
            {nav.take('page:app-visualizer')}
            {nav.take('page:user-settings')}
          </SidebarGroup>
        </Sidebar>
      );
    },
  },
});
