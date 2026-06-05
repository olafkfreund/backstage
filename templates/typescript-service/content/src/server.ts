// ${{ values.name }} — ${{ values.description }}
//
// Fastify entry point. The OpenAPI spec is auto-generated from the routes' Zod
// schemas (via fastify-type-provider-zod + @fastify/swagger) and served at
// `/openapi.json`; Swagger UI is mounted at `/docs`.

import Fastify, { type FastifyInstance } from 'fastify';
import sensible from '@fastify/sensible';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';

import { loadConfig, type Config } from './config.js';
import healthRoute from './routes/health.js';
import echoRoute from './routes/echo.js';

// Read once from package.json so /health can advertise the version.
import { createRequire } from 'node:module';
const pkg = createRequire(import.meta.url)('../package.json') as { version: string };
export const VERSION = pkg.version;

export interface BuildOptions {
  config?: Partial<Config>;
}

/**
 * Build a Fastify instance with all plugins + routes registered, but do not
 * call `.listen()`. Exported so tests can drive it with `fastify.inject(...)`.
 */
export async function buildServer(options: BuildOptions = {}): Promise<FastifyInstance> {
  const cfg: Config = { ...loadConfig(), ...options.config };

  const app = Fastify({
    logger: {
      level: cfg.logLevel,
      transport:
        cfg.nodeEnv === 'development'
          ? { target: 'pino-pretty', options: { translateTime: 'SYS:HH:MM:ss.l', ignore: 'pid,hostname' } }
          : undefined,
    },
    disableRequestLogging: false,
  }).withTypeProvider<ZodTypeProvider>();

  // Make Zod the validator + serializer for every route.
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(sensible);

  await app.register(swagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: '${{ values.name }}',
        description: '${{ values.description }}',
        version: VERSION,
      },
      servers: [{ url: `http://localhost:${cfg.port.toString()}` }],
    },
    transform: jsonSchemaTransform,
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
  });

  // Raw spec at /openapi.json (Swagger UI also exposes one at /docs/json).
  app.get('/openapi.json', { schema: { hide: true } }, async () => app.swagger());

  await app.register(healthRoute);
  await app.register(echoRoute);

  return app;
}

// CommonJS-style entry-point guard: only listen() when run directly,
// not when imported by tests.
const isDirectRun = import.meta.url === `file://${process.argv[1] ?? ''}`;
if (isDirectRun) {
  const cfg = loadConfig();
  const app = await buildServer({ config: cfg });
  try {
    await app.listen({ port: cfg.port, host: cfg.host });
  } catch (err) {
    app.log.error(err, 'failed to start ${{ values.name }}');
    process.exit(1);
  }

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => {
      app.log.info({ signal }, 'received signal, shutting down');
      void app.close().then(() => process.exit(0));
    });
  }
}
