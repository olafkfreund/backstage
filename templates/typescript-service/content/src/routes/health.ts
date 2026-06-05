import { z } from 'zod';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import { VERSION } from '../server.js';

const HealthResponse = z
  .object({
    status: z.literal('ok'),
    version: z.string(),
    uptime: z.number().describe('Process uptime in seconds'),
  })
  .describe('Liveness probe payload');

const plugin: FastifyPluginAsyncZod = async (fastify) => {
  fastify.get(
    '/health',
    {
      schema: {
        tags: ['health'],
        summary: 'Liveness probe',
        response: { 200: HealthResponse },
      },
    },
    async () => ({
      status: 'ok' as const,
      version: VERSION,
      uptime: process.uptime(),
    }),
  );
};

export default plugin;
