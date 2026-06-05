// Bridges incoming GitHub webhook events to a broadcast signal channel
// so frontend widgets can drop their setInterval polling and instead
// re-render on real-time `useSignal('github:activity')` notifications.
//
// Subscriber id is plugin-prefixed so the subscription is durable
// across container restarts. Recipient type 'broadcast' fans out to
// every connected client without per-user filtering — the GitHub
// activity feed is the same data the existing 4 home widgets fetch
// directly from the GitHub API anyway, so there's no extra privacy
// leak.

import {
  createBackendModule,
  coreServices,
} from '@backstage/backend-plugin-api';
import { eventsServiceRef } from '@backstage/plugin-events-node';
import { signalsServiceRef } from '@backstage/plugin-signals-node';

export const signalsGithubBridge = createBackendModule({
  pluginId: 'signals',
  moduleId: 'github-bridge',
  register(reg) {
    reg.registerInit({
      deps: {
        events: eventsServiceRef,
        signals: signalsServiceRef,
        logger: coreServices.logger,
      },
      async init({ events, signals, logger }) {
        await events.subscribe({
          id: 'github-activity-bridge',
          topics: ['github'],
          async onEvent(params) {
            const payload = params.eventPayload as Record<string, unknown>;
            const eventName =
              (params.metadata?.['x-github-event'] as string | undefined) ??
              'unknown';
            const repo =
              ((payload?.repository as Record<string, unknown> | undefined)
                ?.full_name as string | undefined) ?? 'unknown';
            logger.debug(
              `signals/github-bridge: rebroadcasting ${eventName} from ${repo}`,
            );
            await signals.publish({
              recipients: { type: 'broadcast' },
              channel: 'github:activity',
              message: {
                event: eventName,
                repo,
                timestamp: new Date().toISOString(),
              },
            });
          },
        });
        logger.info(
          'signals/github-bridge: subscribed to github topic, will publish to channel github:activity',
        );
      },
    });
  },
});
