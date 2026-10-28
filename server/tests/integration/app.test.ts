import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { createLogger } from '../../src/logging/logger.js';

const ALLOWED_ORIGIN = 'http://localhost:5173';
const app = createApp({ clientOrigin: ALLOWED_ORIGIN, logger: createLogger('silent') });

describe('API de base', () => {
  it('GET /api/health répond 200 avec { status: "ok" }', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('renvoie une 404 JSON pour une route inconnue', async () => {
    const res = await request(app).get('/api/inexistant');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('renvoie une 400 propre (sans trace interne) pour un JSON invalide', async () => {
    const res = await request(app)
      .post('/api/health')
      .set('Content-Type', 'application/json')
      .send('{json-invalide');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
    expect(JSON.stringify(res.body)).not.toContain('SyntaxError');
    expect(JSON.stringify(res.body)).not.toContain('node_modules');
  });

  it('refuse un corps JSON trop volumineux (413)', async () => {
    const res = await request(app)
      .post('/api/health')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ data: 'x'.repeat(200_000) }));
    expect(res.status).toBe(413);
  });
});

describe('En-têtes de sécurité', () => {
  it("n'expose pas X-Powered-By", async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('ajoute les en-têtes Helmet', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toBeDefined();
  });

  it("n'autorise jamais une autre origine que celle configurée", async () => {
    const res = await request(app).get('/api/health').set('Origin', 'https://evil.example');
    expect(res.headers['access-control-allow-origin']).toBe(ALLOWED_ORIGIN);
  });
});
