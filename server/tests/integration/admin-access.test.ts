import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createLogger } from '../../src/logging/logger.js';
import { createErrorHandler } from '../../src/middlewares/error-handler.js';
import { createAuthMiddlewares } from '../../src/modules/auth/auth.middleware.js';
import { computeCsrfToken } from '../../src/modules/auth/csrf.js';
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  CLIENT_ORIGIN,
  COOKIE_NAME,
  CSRF_SECRET,
  createTestApp,
} from '../helpers/fakes.js';

async function adminCookie(app: ReturnType<typeof createTestApp>['app'], email = ADMIN_EMAIL) {
  const res = await request(app)
    .post('/api/auth/login')
    .set('Origin', CLIENT_ORIGIN)
    .set('Content-Type', 'application/json')
    .send(JSON.stringify({ email, password: ADMIN_PASSWORD }));
  const line = ((res.headers['set-cookie'] ?? []) as unknown as string[])[0] ?? '';
  return line.split(';')[0] ?? '';
}

describe('Accès à /api/admin', () => {
  it('refuse tout visiteur anonyme, y compris sur une adresse qui n’existe pas', async () => {
    const { app } = createTestApp();
    for (const path of ['/api/admin/status', '/api/admin/inconnu', '/api/admin/projects/1']) {
      const res = await request(app).get(path);
      expect(res.status, path).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    }
    const write = await request(app).post('/api/admin/projects').send({});
    expect(write.status).toBe(401);
  });

  it('refuse un cookie falsifié, mal formé ou expiré', async () => {
    const { app, fakeAuth } = createTestApp();
    const fake = `${COOKIE_NAME}=${'b'.repeat(43)}`;
    expect((await request(app).get('/api/admin/status').set('Cookie', fake)).status).toBe(401);
    expect((await request(app).get('/api/admin/status').set('Cookie', `${COOKIE_NAME}=x`)).status).toBe(401);

    const cookie = await adminCookie(app);
    fakeAuth.advance(10_000);
    expect((await request(app).get('/api/admin/status').set('Cookie', cookie)).status).toBe(401);
  });

  it('autorise un administrateur connecté', async () => {
    const { app } = createTestApp();
    const cookie = await adminCookie(app);
    const res = await request(app).get('/api/admin/status').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(ADMIN_EMAIL);
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('refuse un utilisateur connecté qui n’a pas le rôle administrateur (403)', async () => {
    const { app, fakeAuth } = createTestApp();
    fakeAuth.addUser({ email: 'lecteur@exemple.com', password: ADMIN_PASSWORD, role: 'viewer' });
    const cookie = await adminCookie(app, 'lecteur@exemple.com');
    const res = await request(app).get('/api/admin/status').set('Cookie', cookie);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('laisse les routes publiques accessibles sans connexion', async () => {
    const { app } = createTestApp();
    expect((await request(app).get('/api/public/projects')).status).toBe(200);
    expect((await request(app).get('/api/health')).status).toBe(200);
  });
});

describe('Protection CSRF et origine (middlewares)', () => {
  async function buildMiniApp() {
    const test = createTestApp();
    const { token } = await test.authService.login(
      { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
      { ip: '127.0.0.1', userAgent: 'test' },
    );
    const mw = createAuthMiddlewares({
      service: test.authService,
      cookieName: COOKIE_NAME,
      csrfSecret: CSRF_SECRET,
      clientOrigin: CLIENT_ORIGIN,
    });

    const mini = express();
    mini.use(express.json());
    mini.use(mw.attachUser);
    mini.get('/lecture', mw.requireAuth, mw.requireSameOrigin, mw.requireCsrf, (_req, res) => {
      res.json({ ok: true });
    });
    mini.post('/ecriture', mw.requireAuth, mw.requireSameOrigin, mw.requireCsrf, (_req, res) => {
      res.json({ ok: true });
    });
    mini.delete('/ecriture', mw.requireAuth, mw.requireSameOrigin, mw.requireCsrf, (_req, res) => {
      res.json({ ok: true });
    });
    mini.use(createErrorHandler(createLogger('silent')));
    return { mini, cookie: `${COOKIE_NAME}=${token}`, csrf: computeCsrfToken(CSRF_SECRET, token) };
  }

  it('n’exige pas de jeton CSRF pour une simple lecture', async () => {
    const { mini, cookie } = await buildMiniApp();
    expect((await request(mini).get('/lecture').set('Cookie', cookie)).status).toBe(200);
  });

  it('refuse une écriture sans jeton CSRF ou avec un mauvais jeton', async () => {
    const { mini, cookie } = await buildMiniApp();
    const missing = await request(mini).post('/ecriture').set('Cookie', cookie);
    expect(missing.status).toBe(403);
    expect(missing.body.error.code).toBe('INVALID_CSRF_TOKEN');

    const wrong = await request(mini).post('/ecriture').set('Cookie', cookie).set('X-CSRF-Token', 'invalide');
    expect(wrong.status).toBe(403);
    expect((await request(mini).delete('/ecriture').set('Cookie', cookie)).status).toBe(403);
  });

  it('accepte une écriture avec le bon jeton et la bonne origine', async () => {
    const { mini, cookie, csrf } = await buildMiniApp();
    const res = await request(mini)
      .post('/ecriture')
      .set('Cookie', cookie)
      .set('Origin', CLIENT_ORIGIN)
      .set('X-CSRF-Token', csrf);
    expect(res.status).toBe(200);
  });

  it('refuse une écriture venant d’une autre origine, même avec le bon jeton', async () => {
    const { mini, cookie, csrf } = await buildMiniApp();
    const res = await request(mini)
      .post('/ecriture')
      .set('Cookie', cookie)
      .set('Origin', 'https://evil.example')
      .set('X-CSRF-Token', csrf);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN_ORIGIN');
  });

  it('refuse l’écriture d’un autre utilisateur avec le jeton CSRF d’une autre session', async () => {
    const first = await buildMiniApp();
    const second = await buildMiniApp();
    const res = await request(first.mini)
      .post('/ecriture')
      .set('Cookie', first.cookie)
      .set('X-CSRF-Token', second.csrf);
    expect(res.status).toBe(403);
  });
});
