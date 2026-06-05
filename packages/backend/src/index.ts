/*
 * Hi!
 *
 * Note that this is an EXAMPLE Backstage backend. Please check the README.
 *
 * Happy hacking!
 */

import { createBackend } from '@backstage/backend-defaults';

const backend = createBackend();

backend.add(import('@backstage/plugin-app-backend'));
backend.add(import('@backstage/plugin-proxy-backend'));

// scaffolder plugin
backend.add(import('@backstage/plugin-scaffolder-backend'));
backend.add(import('@backstage/plugin-scaffolder-backend-module-github'));
backend.add(import('@backstage/plugin-scaffolder-backend-module-gitlab'));
backend.add(
  import('@backstage/plugin-scaffolder-backend-module-notifications'),
);

// techdocs plugin
backend.add(import('@backstage/plugin-techdocs-backend'));

// auth plugin
backend.add(import('@backstage/plugin-auth-backend'));
// See https://backstage.io/docs/backend-system/building-backends/migrating#the-auth-plugin
backend.add(import('@backstage/plugin-auth-backend-module-guest-provider'));
backend.add(import('@backstage/plugin-auth-backend-module-github-provider'));
// See https://backstage.io/docs/auth/guest/provider

// catalog plugin
backend.add(import('@backstage/plugin-catalog-backend'));
backend.add(
  import('@backstage/plugin-catalog-backend-module-scaffolder-entity-model'),
);
// GitHub discovery: scans olafkfreund's repos for catalog-info.yaml so
// every onboarded repo appears automatically. PR-bot in
// .github/workflows/catalog-onboard.yml seeds catalog-info.yaml across
// repos that don't have it yet. Provider config lives in
// app-config.production.yaml under catalog.providers.github.
backend.add(import('@backstage/plugin-catalog-backend-module-github'));

// GitLab discovery: scans the configured gitlab.com group/path for
// catalog-info.yaml. Requires backstage-gitlab-token agenix secret.
// Provider config lives in app-config.production.yaml under
// catalog.providers.gitlab.
backend.add(import('@backstage/plugin-catalog-backend-module-gitlab'));

// See https://backstage.io/docs/features/software-catalog/configuration#subscribing-to-catalog-errors
backend.add(import('@backstage/plugin-catalog-backend-module-logs'));

// permission plugin
backend.add(import('@backstage/plugin-permission-backend'));
// See https://backstage.io/docs/permissions/getting-started for how to create your own permission policy
backend.add(
  import('@backstage/plugin-permission-backend-module-allow-all-policy'),
);

// search plugin
backend.add(import('@backstage/plugin-search-backend'));

// search engine
// See https://backstage.io/docs/features/search/search-engines
backend.add(import('@backstage/plugin-search-backend-module-pg'));

// search collators
backend.add(import('@backstage/plugin-search-backend-module-catalog'));
backend.add(import('@backstage/plugin-search-backend-module-techdocs'));

// Kubernetes plugin removed — k3s microvms are dormant on p510, the
// frontend errored "Entity context is not available" for every entity
// without k8s annotations. Re-add by `yarn add @backstage/plugin-
// kubernetes-backend` in packages/backend and `@backstage/plugin-
// kubernetes` in packages/app, then re-enable here, when a real cluster
// exists.

// NOTE: @backstage/plugin-explore-backend and @backstage/plugin-todo-
// backend still use the LEGACY backend system (default export is a
// createRouter factory, not a BackendFeature). They can't be added
// directly to the new-system `backend.add(...)`. The frontend explore
// and todo plugins still load — explore shows seed tool data only,
// todo's per-entity tab is empty until the backend is wired. Add via
// a legacyPlugin wrapper or wait for upstream migration.

// notifications and signals plugins
backend.add(import('@backstage/plugin-notifications-backend'));
backend.add(import('@backstage/plugin-signals-backend'));

// mcp actions plugin
backend.add(import('@backstage/plugin-mcp-actions-backend'));

// Events backend + GitHub module. Exposes POST /api/events/http/github
// for GitHub webhook delivery, validates HMAC-SHA256 with the secret
// from env (GITHUB_WEBHOOK_SECRET, bridged from agenix), and publishes
// the parsed event onto the `github` topic. Subscribers (e.g. a
// catalog-refresh-on-push module, or signals re-broadcasters) can
// register against that topic without further plumbing.
//
// Tailscale Funnel exposes the webhook path publicly; HMAC validation
// is the only gate, so the secret must be high-entropy.
backend.add(import('@backstage/plugin-events-backend'));
backend.add(import('@backstage/plugin-events-backend-module-github'));

backend.start();
