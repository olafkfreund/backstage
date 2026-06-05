// Boot the Fastify app, read the OpenAPI spec, write it to ./openapi.json,
// shut down. Used by `pnpm openapi` to refresh the static spec that the
// Backstage API entity references.

import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { buildServer } from '../src/server.js';

const app = await buildServer({ config: { logLevel: 'silent', nodeEnv: 'production' } });
try {
  const spec = app.swagger();
  const outPath = resolve(process.cwd(), 'openapi.json');
  await writeFile(outPath, `${JSON.stringify(spec, null, 2)}\n`, 'utf8');
  // eslint-disable-next-line no-console
  console.log(`wrote ${outPath}`);
} finally {
  await app.close();
}
