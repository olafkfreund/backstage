import { createApp } from '@backstage/frontend-defaults';
import catalogPlugin from '@backstage/plugin-catalog/alpha';
import { navModule } from './modules/nav';
import { signInPageModule } from './modules/signInPage';
import { homePageModule } from './modules/home';
import { themeModule } from './modules/theme';
import { catalogModule } from './modules/catalog';

export default createApp({
  features: [
    catalogPlugin,
    navModule,
    signInPageModule,
    homePageModule,
    themeModule,
    catalogModule,
  ],
});
