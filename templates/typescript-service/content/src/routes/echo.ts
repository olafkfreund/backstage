import { z } from 'zod';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

const EchoBody = z
  .object({
    message: z.string().min(1).describe('Arbitrary string to echo back'),
  })
  .describe('Echo request body');

const EchoResponse = z
  .object({
    message: z.string(),
    receivedAt: z.string().datetime().describe('ISO-8601 timestamp the request was received'),
  })
  .describe('Echo response payload');

const plugin: FastifyPluginAsyncZod = async (fastify) => {
  fastify.post(
    '/echo',
    {
      schema: {
        tags: ['echo'],
        summary: 'Echo a JSON message back',
        body: EchoBody,
        response: { 200: EchoResponse },
      },
    },
    async (req) => {
      req.log.debug({ length: req.body.message.length }, 'echoing message');
      return {
        message: req.body.message,
        receivedAt: new Date().toISOString(),
      };
    },
  );
};

export default plugin;
