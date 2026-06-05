import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { buildServer } from '../src/server.js';

type App = Awaited<ReturnType<typeof buildServer>>;

describe('${{ values.name }} server', () => {
  let app: App;

  beforeEach(async () => {
    app = await buildServer({ config: { logLevel: 'silent', nodeEnv: 'test' } });
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /health', () => {
    it('returns 200 with status, version, uptime', async () => {
      const res = await app.inject({ method: 'GET', url: '/health' });
      expect(res.statusCode).toBe(200);
      const body = res.json() as { status: string; version: string; uptime: number };
      expect(body.status).toBe('ok');
      expect(typeof body.version).toBe('string');
      expect(body.version.length).toBeGreaterThan(0);
      expect(typeof body.uptime).toBe('number');
      expect(body.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('POST /echo', () => {
    it('echoes the message with a receivedAt timestamp', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/echo',
        payload: { message: 'hello world' },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json() as { message: string; receivedAt: string };
      expect(body.message).toBe('hello world');
      expect(() => new Date(body.receivedAt).toISOString()).not.toThrow();
      expect(new Date(body.receivedAt).toString()).not.toBe('Invalid Date');
    });

    it('rejects an empty message with 400', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/echo',
        payload: { message: '' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('rejects a missing message with 400', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/echo',
        payload: {},
      });
      expect(res.statusCode).toBe(400);
    });

    it('rejects a non-string message with 400', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/echo',
        payload: { message: 42 },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('OpenAPI spec', () => {
    it('serves /openapi.json with both endpoints', async () => {
      const res = await app.inject({ method: 'GET', url: '/openapi.json' });
      expect(res.statusCode).toBe(200);
      const spec = res.json() as {
        openapi: string;
        paths: Record<string, unknown>;
      };
      expect(spec.openapi).toMatch(/^3\./);
      expect(spec.paths['/health']).toBeDefined();
      expect(spec.paths['/echo']).toBeDefined();
    });
  });

  describe('Swagger UI', () => {
    it('serves the docs page at /docs', async () => {
      const res = await app.inject({ method: 'GET', url: '/docs', headers: { accept: 'text/html' } });
      // /docs redirects to /docs/static/index.html in some versions; either is fine.
      expect([200, 302]).toContain(res.statusCode);
    });
  });
});
