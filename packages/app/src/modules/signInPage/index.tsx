// Custom sign-in page that exposes both providers configured in
// app-config.production.yaml — Guest (always available) and GitHub
// OAuth (production only). The declarative-frontend default sign-in
// page does NOT auto-render OAuth providers; an explicit SignInPage
// extension is required.
//
// Without this module the user only sees the Guest card, and clicking
// "Sign in with GitHub" is impossible from the UI even though the
// backend handler at /api/auth/github/* is wired correctly.

import { createFrontendModule } from '@backstage/frontend-plugin-api';
import {
  SignInPageBlueprint,
  type SignInPageProps,
} from '@backstage/plugin-app-react';
import { SignInPage } from '@backstage/core-components';
import { githubAuthApiRef } from '@backstage/core-plugin-api';

const CustomSignInPage = (props: SignInPageProps) => (
  <SignInPage
    {...props}
    providers={[
      'guest',
      {
        id: 'github-auth-provider',
        title: 'GitHub',
        message: 'Sign in using GitHub',
        apiRef: githubAuthApiRef,
      },
    ]}
  />
);

const signInPage = SignInPageBlueprint.make({
  params: {
    loader: async () => CustomSignInPage,
  },
});

export const signInPageModule = createFrontendModule({
  pluginId: 'app',
  extensions: [signInPage],
});
