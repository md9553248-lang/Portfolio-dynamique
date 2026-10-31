import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createTestApp } from '../helpers/fakes.js';

const ALLOWED_ORIGIN = 'http://localhost:5173';

describe('API de base', () => {
  it('GET /api/health répond 200 avec { status: "ok" }', async () => {
    const { app } = createTestApp();
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('GET /api/health/ready répond 200 quand la base répond', async () => {
    const { app } = createTestApp();
    const res = await request(app).get('/api/health/ready');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ready' });
  });

  it('GET /api/health/ready répond 503 sans détail quand la base est en panne', async () => {
    const { app } = createTestApp({
      ping: async () => {
        throw Object.assign(new Error('connexion refusée vers 10.0.0.5 avec le mot de passe xyz'), {
          code: 'ECONNREFUSED',
        });
      },
    });
    const res = await request(app).get('/api/health/ready');
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ status: 'unavailable' });
    expect(JSON.stringify(res.body)).not.toContain('10.0.0.5');
  });

  it('renvoie une 404 JSON pour une route inconnue', async () => {
    const { app } = createTestApp();
    const res = await request(app).get('/api/inexistant');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('renvoie une 400 propre (sans trace interne) pour un JSON invalide', async () => {
    const { app } = createTestApp();
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
    const { app } = createTestApp();
    const res = await request(app)
      .post('/api/health')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ data: 'x'.repeat(50_000) }));
    expect(res.status).toBe(413);
  });
});

describe('En-têtes de sécurité et traçabilité', () => {
  it("n'expose pas X-Powered-By", async () => {
    const { app } = createTestApp();
    const res = await request(app).get('/api/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('ajoute les en-têtes Helmet', async () => {
    const { app } = createTestApp();
    const res = await request(app).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toBeDefined();
  });

  it("n'autorise jamais une autre origine que celle configurée", async () => {
    const { app } = createTestApp();
    const res = await request(app).get('/api/health').set('Origin', 'https://evil.example');
    expect(res.headers['access-control-allow-origin']).toBe(ALLOWED_ORIGIN);
  });

  it('demande une revalidation du cache pour toute l’API', async () => {
    const { app } = createTestApp();
    const res = await request(app).get('/api/health');
    expect(res.headers['cache-control']).toBe('no-cache');
  });

  it('attribue un identifiant à chaque requête', async () => {
    const { app } = createTestApp();
    const res = await request(app).get('/api/health');
    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });
});
