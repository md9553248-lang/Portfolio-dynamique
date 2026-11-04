import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { computeCsrfToken } from '../../src/modules/auth/csrf.js';
import { hashSessionToken } from '../../src/modules/auth/session-cookie.js';
import {
  ABSOLUTE_SECONDS,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  CLIENT_ORIGIN,
  COOKIE_NAME,
  CSRF_SECRET,
  IDLE_SECONDS,
  createTestApp,
} from '../helpers/fakes.js';

type TestApp = ReturnType<typeof createTestApp>['app'];

function login(app: TestApp, email: string = ADMIN_EMAIL, password: string = ADMIN_PASSWORD) {
  return request(app)
    .post('/api/auth/login')
    .set('Origin', CLIENT_ORIGIN)
    .set('Content-Type', 'application/json')
    .send(JSON.stringify({ email, password }));
}

/** Valeur brute du cookie de session et ligne Set-Cookie complète. */
function readCookie(res: request.Response): { value: string; raw: string } {
  const lines = (res.headers['set-cookie'] ?? []) as unknown as string[];
  const raw = lines.find((line) => line.startsWith(`${COOKIE_NAME}=`)) ?? '';
  return { value: raw.split(';')[0]?.slice(COOKIE_NAME.length + 1) ?? '', raw };
}

async function openSession(app: TestApp) {
  const res = await login(app);
  expect(res.status).toBe(200);
  const { value } = readCookie(res);
  return { value, cookie: `${COOKIE_NAME}=${value}`, csrf: res.body.data.csrfToken as string };
}

describe('POST /api/auth/login', () => {
  it('ouvre une session et renvoie l’utilisateur et un jeton CSRF', async () => {
    const { app } = createTestApp();
    const res = await login(app);

    expect(res.status).toBe(200);
    expect(res.body.data.user).toMatchObject({ email: ADMIN_EMAIL, role: 'admin' });
    const { value } = readCookie(res);
    expect(res.body.data.csrfToken).toBe(computeCsrfToken(CSRF_SECRET, value));
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('ne renvoie jamais l’empreinte ni le mot de passe', async () => {
    const { app } = createTestApp();
    const res = await login(app);
    expect(JSON.stringify(res.body)).not.toContain('fake$');
    expect(JSON.stringify(res.body)).not.toContain(ADMIN_PASSWORD);
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it('pose un cookie HttpOnly, SameSite=Strict, sans durée (cookie de session)', async () => {
    const { app } = createTestApp();
    const { raw } = readCookie(await login(app));
    expect(raw).toContain('HttpOnly');
    expect(raw).toContain('SameSite=Strict');
    expect(raw).toContain('Path=/');
    expect(raw).not.toContain('Max-Age');
    expect(raw).not.toContain('Expires');
    expect(raw).not.toContain('Domain');
    expect(raw).not.toContain('Secure'); // en test (HTTP) ; voir le test suivant pour la production
  });

  it('ajoute l’attribut Secure en production (HTTPS)', async () => {
    const { app } = createTestApp(
      {},
      { session: { cookie: { name: '__Host-portfolio_session', secure: true }, csrfSecret: CSRF_SECRET } },
    );
    const res = await login(app);
    const line = (res.headers['set-cookie'] as unknown as string[])[0] ?? '';
    expect(line.startsWith('__Host-portfolio_session=')).toBe(true);
    expect(line).toContain('Secure');
    expect(line).toContain('Path=/');
  });

  it('ne stocke que l’empreinte du jeton de session, jamais le jeton', async () => {
    const { app, fakeAuth } = createTestApp();
    const { value } = readCookie(await login(app));
    expect(fakeAuth.sessions.has(hashSessionToken(value))).toBe(true);
    expect(fakeAuth.sessions.has(value)).toBe(false);
  });

  it('répond de la même façon pour un mauvais mot de passe et pour un compte inexistant', async () => {
    const { app } = createTestApp();
    const wrongPassword = await login(app, ADMIN_EMAIL, 'mauvais-mot-de-passe');
    const unknownAccount = await login(app, 'inconnu@exemple.com', 'mauvais-mot-de-passe');

    expect(wrongPassword.status).toBe(401);
    expect(unknownAccount.status).toBe(401);
    expect(unknownAccount.body).toEqual(wrongPassword.body);
    expect(wrongPassword.body.error.code).toBe('INVALID_CREDENTIALS');
    expect(readCookie(wrongPassword).raw).toBe('');
  });

  it('effectue quand même une vérification de mot de passe pour un compte inexistant (même durée de calcul)', async () => {
    const { app, hasher } = createTestApp();
    await login(app, 'inconnu@exemple.com', 'mauvais-mot-de-passe');
    expect(hasher.verify).toHaveBeenCalledTimes(1);
  });

  it('refuse un compte désactivé avec le même message', async () => {
    const { app, fakeAuth } = createTestApp();
    fakeAuth.addUser({ email: 'desactive@exemple.com', password: ADMIN_PASSWORD, isActive: false });
    const res = await login(app, 'desactive@exemple.com', ADMIN_PASSWORD);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('ignore la casse et les espaces autour de l’adresse e-mail', async () => {
    const { app } = createTestApp();
    const res = await login(app, `  ${ADMIN_EMAIL.toUpperCase()}  `);
    expect(res.status).toBe(200);
  });

  it('impose un délai croissant après 5 échecs, même avec le bon mot de passe', async () => {
    const { app, fakeAuth } = createTestApp();
    for (let attempt = 0; attempt < 5; attempt++) {
      expect((await login(app, ADMIN_EMAIL, 'mauvais')).status).toBe(401);
    }

    const blocked = await login(app);
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('TOO_MANY_ATTEMPTS');
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
    expect(Number(blocked.headers['retry-after'])).toBeLessThanOrEqual(30);
    expect(readCookie(blocked).raw).toBe('');

    fakeAuth.advance(31);
    expect((await login(app)).status).toBe(200);
  });

  it('double le délai à l’échec suivant (délai progressif)', async () => {
    const { app, fakeAuth } = createTestApp();
    for (let attempt = 0; attempt < 5; attempt++) await login(app, ADMIN_EMAIL, 'mauvais');
    fakeAuth.advance(31);
    expect((await login(app, ADMIN_EMAIL, 'mauvais')).status).toBe(401);

    const blocked = await login(app);
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(30);
    expect(Number(blocked.headers['retry-after'])).toBeLessThanOrEqual(60);
  });

  it('remet les compteurs à zéro après une connexion réussie', async () => {
    const { app } = createTestApp();
    for (let attempt = 0; attempt < 4; attempt++) await login(app, ADMIN_EMAIL, 'mauvais');
    expect((await login(app)).status).toBe(200);
    for (let attempt = 0; attempt < 4; attempt++) {
      expect((await login(app, ADMIN_EMAIL, 'mauvais')).status).toBe(401);
    }
  });

  it('protège aussi contre une attaque répartie sur de nombreuses adresses IP', async () => {
    const { app } = createTestApp({}, { trustProxy: 1 });
    for (let attempt = 0; attempt < 20; attempt++) {
      const res = await login(app, ADMIN_EMAIL, 'mauvais').set('X-Forwarded-For', `10.0.0.${attempt + 1}`);
      expect(res.status).toBe(401);
    }
    const fromNewAddress = await login(app).set('X-Forwarded-For', '10.0.1.1');
    expect(fromNewAddress.status).toBe(429);
    expect(fromNewAddress.body.error.code).toBe('TOO_MANY_ATTEMPTS');
  });

  it('limite le nombre de tentatives par adresse IP (en plus du délai par compte)', async () => {
    const { app } = createTestApp({}, { rateLimits: { login: { windowMs: 60_000, limit: 3 } } });
    for (let attempt = 0; attempt < 3; attempt++) await login(app, ADMIN_EMAIL, 'mauvais');
    const limited = await login(app);
    expect(limited.status).toBe(429);
    expect(limited.body.error.code).toBe('TOO_MANY_REQUESTS');
  });

  it('refuse les envois invalides', async () => {
    const { app } = createTestApp();
    const post = (body: unknown) =>
      request(app).post('/api/auth/login').set('Content-Type', 'application/json').send(JSON.stringify(body));

    expect((await post({ email: ADMIN_EMAIL })).status).toBe(400);
    expect((await post({ password: 'x' })).status).toBe(400);
    expect((await post({ email: ADMIN_EMAIL, password: 'x'.repeat(129) })).status).toBe(400);
    expect((await post({ email: ADMIN_EMAIL, password: 'x', role: 'admin' })).status).toBe(400);
    expect((await post({ email: 42, password: 'x' })).status).toBe(400);

    const form = await request(app).post('/api/auth/login').type('form').send({ email: ADMIN_EMAIL });
    expect(form.status).toBe(415);
  });

  it('refuse une requête venant d’un autre site', async () => {
    const { app, fakeAuth } = createTestApp();
    const foreign = await login(app).set('Origin', 'https://evil.example');
    expect(foreign.status).toBe(403);
    expect(foreign.body.error.code).toBe('FORBIDDEN_ORIGIN');
    expect(readCookie(foreign).raw).toBe('');

    const crossSite = await login(app).set('Sec-Fetch-Site', 'cross-site');
    expect(crossSite.status).toBe(403);
    expect(fakeAuth.sessions.size).toBe(0);
  });

  it('accepte une requête sans en-tête Origin (outil en ligne de commande)', async () => {
    const { app } = createTestApp();
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }));
    expect(res.status).toBe(200);
  });

  it('crée une nouvelle session à chaque connexion et ferme l’ancienne', async () => {
    const { app, fakeAuth } = createTestApp();
    const first = await openSession(app);

    const second = await login(app).set('Cookie', first.cookie);
    expect(second.status).toBe(200);
    const secondValue = readCookie(second).value;
    expect(secondValue).not.toBe(first.value);

    expect(fakeAuth.sessions.size).toBe(1);
    expect((await request(app).get('/api/auth/me').set('Cookie', first.cookie)).status).toBe(401);
    expect(
      (await request(app).get('/api/auth/me').set('Cookie', `${COOKIE_NAME}=${secondValue}`)).status,
    ).toBe(200);
  });
});

describe('GET /api/auth/me', () => {
  it('refuse un visiteur sans session', async () => {
    const { app } = createTestApp();
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('renvoie l’utilisateur et le jeton CSRF d’une session valide', async () => {
    const { app } = createTestApp();
    const session = await openSession(app);
    const res = await request(app).get('/api/auth/me').set('Cookie', session.cookie);
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(ADMIN_EMAIL);
    expect(res.body.data.csrfToken).toBe(session.csrf);
  });

  it('refuse un cookie mal formé sans interroger la base', async () => {
    const { app, fakeAuth } = createTestApp();
    const spy = vi.spyOn(fakeAuth.repo, 'findActiveSession');
    for (const value of ['abc', "x' OR '1'='1", 'a'.repeat(300)]) {
      const res = await request(app).get('/api/auth/me').set('Cookie', `${COOKIE_NAME}=${encodeURIComponent(value)}`);
      expect(res.status).toBe(401);
    }
    expect(spy).not.toHaveBeenCalled();
  });

  it('refuse un jeton bien formé mais inconnu', async () => {
    const { app } = createTestApp();
    const res = await request(app).get('/api/auth/me').set('Cookie', `${COOKIE_NAME}=${'a'.repeat(43)}`);
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/logout', () => {
  it('exige le jeton CSRF quand une session existe', async () => {
    const { app, fakeAuth } = createTestApp();
    const session = await openSession(app);

    const withoutToken = await request(app)
      .post('/api/auth/logout')
      .set('Origin', CLIENT_ORIGIN)
      .set('Cookie', session.cookie);
    expect(withoutToken.status).toBe(403);
    expect(withoutToken.body.error.code).toBe('INVALID_CSRF_TOKEN');

    const wrongToken = await request(app)
      .post('/api/auth/logout')
      .set('Origin', CLIENT_ORIGIN)
      .set('Cookie', session.cookie)
      .set('X-CSRF-Token', computeCsrfToken(CSRF_SECRET, 'une-autre-session'));
    expect(wrongToken.status).toBe(403);
    expect(fakeAuth.sessions.size).toBe(1);
  });

  it('ferme réellement la session et efface le cookie', async () => {
    const { app, fakeAuth } = createTestApp();
    const session = await openSession(app);

    const res = await request(app)
      .post('/api/auth/logout')
      .set('Origin', CLIENT_ORIGIN)
      .set('Cookie', session.cookie)
      .set('X-CSRF-Token', session.csrf);
    expect(res.status).toBe(200);
    expect(readCookie(res).raw).toContain('Expires=Thu, 01 Jan 1970');
    expect(fakeAuth.sessions.size).toBe(0);

    // Le même cookie, rejoué, ne donne plus aucun accès.
    expect((await request(app).get('/api/auth/me').set('Cookie', session.cookie)).status).toBe(401);
  });

  it('est sans effet (mais réussit) quand on n’est pas connecté', async () => {
    const { app } = createTestApp();
    const res = await request(app).post('/api/auth/logout').set('Origin', CLIENT_ORIGIN);
    expect(res.status).toBe(200);
  });

  it('refuse une demande venant d’un autre site', async () => {
    const { app, fakeAuth } = createTestApp();
    const session = await openSession(app);
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Origin', 'https://evil.example')
      .set('Cookie', session.cookie)
      .set('X-CSRF-Token', session.csrf);
    expect(res.status).toBe(403);
    expect(fakeAuth.sessions.size).toBe(1);
  });
});

describe('Expiration des sessions', () => {
  it('ferme une session inactive trop longtemps', async () => {
    const { app, fakeAuth } = createTestApp();
    const session = await openSession(app);

    fakeAuth.advance(IDLE_SECONDS - 10);
    expect((await request(app).get('/api/auth/me').set('Cookie', session.cookie)).status).toBe(200);

    fakeAuth.advance(IDLE_SECONDS + 1);
    expect((await request(app).get('/api/auth/me').set('Cookie', session.cookie)).status).toBe(401);
  });

  it('ferme la session à la fin de sa durée maximale, même si l’utilisateur reste actif', async () => {
    const { app, fakeAuth } = createTestApp();
    const session = await openSession(app);

    // Activité régulière : l'inactivité n'est jamais atteinte, mais la durée absolue finit par l'être.
    let elapsed = 0;
    while (elapsed + 200 < ABSOLUTE_SECONDS) {
      fakeAuth.advance(200);
      elapsed += 200;
      expect((await request(app).get('/api/auth/me').set('Cookie', session.cookie)).status).toBe(200);
    }
    fakeAuth.advance(ABSOLUTE_SECONDS - elapsed + 1);
    expect((await request(app).get('/api/auth/me').set('Cookie', session.cookie)).status).toBe(401);
  });

  it('refuse une session dont le compte a été désactivé', async () => {
    const { app, fakeAuth } = createTestApp();
    const session = await openSession(app);
    const user = [...fakeAuth.users.values()][0];
    if (user) user.isActive = false;
    expect((await request(app).get('/api/auth/me').set('Cookie', session.cookie)).status).toBe(401);
  });
});

describe('POST /api/auth/change-password', () => {
  const NEW_PASSWORD = 'Un-Autre-Mot-De-Passe-Solide-2026';

  function changePassword(app: TestApp, session: { cookie: string; csrf: string }, body: unknown) {
    return request(app)
      .post('/api/auth/change-password')
      .set('Origin', CLIENT_ORIGIN)
      .set('Cookie', session.cookie)
      .set('X-CSRF-Token', session.csrf)
      .set('Content-Type', 'application/json')
      .send(JSON.stringify(body));
  }

  it('exige une session et le jeton CSRF', async () => {
    const { app } = createTestApp();
    const anonymous = await request(app)
      .post('/api/auth/change-password')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ currentPassword: ADMIN_PASSWORD, newPassword: NEW_PASSWORD }));
    expect(anonymous.status).toBe(401);

    const session = await openSession(app);
    const noCsrf = await request(app)
      .post('/api/auth/change-password')
      .set('Cookie', session.cookie)
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ currentPassword: ADMIN_PASSWORD, newPassword: NEW_PASSWORD }));
    expect(noCsrf.status).toBe(403);
  });

  it('refuse un mot de passe actuel incorrect', async () => {
    const { app } = createTestApp();
    const session = await openSession(app);
    const res = await changePassword(app, session, { currentPassword: 'faux', newPassword: NEW_PASSWORD });
    expect(res.status).toBe(400);
    expect(res.body.error.fields.currentPassword).toBeDefined();
  });

  it('refuse un nouveau mot de passe trop faible, identique ou qui contient le nom', async () => {
    const { app } = createTestApp();
    const session = await openSession(app);

    const weak = await changePassword(app, session, { currentPassword: ADMIN_PASSWORD, newPassword: 'court' });
    expect(weak.status).toBe(400);
    expect(weak.body.error.fields.newPassword).toBeDefined();

    const same = await changePassword(app, session, {
      currentPassword: ADMIN_PASSWORD,
      newPassword: ADMIN_PASSWORD,
    });
    expect(same.status).toBe(400);

    const containsName = await changePassword(app, session, {
      currentPassword: ADMIN_PASSWORD,
      newPassword: 'administrateur-2026-ok',
    });
    expect(containsName.status).toBe(400);
  });

  it('change le mot de passe, garde la session actuelle et ferme les autres', async () => {
    const { app, fakeAuth } = createTestApp();
    const otherDevice = await openSession(app);
    const thisDevice = await openSession(app); // 2e connexion, sans cookie envoyé : une 2e session coexiste
    expect(fakeAuth.sessions.size).toBe(2);

    const res = await changePassword(app, thisDevice, {
      currentPassword: ADMIN_PASSWORD,
      newPassword: NEW_PASSWORD,
    });
    expect(res.status).toBe(200);

    expect((await request(app).get('/api/auth/me').set('Cookie', thisDevice.cookie)).status).toBe(200);
    expect((await request(app).get('/api/auth/me').set('Cookie', otherDevice.cookie)).status).toBe(401);
    expect(fakeAuth.sessions.size).toBe(1);

    expect((await login(app, ADMIN_EMAIL, ADMIN_PASSWORD)).status).toBe(401);
    expect((await login(app, ADMIN_EMAIL, NEW_PASSWORD)).status).toBe(200);
  });
});

describe('Journal d’audit', () => {
  it('trace les connexions sans jamais enregistrer l’e-mail ni le mot de passe', async () => {
    const { app, fakeAuth } = createTestApp();
    await login(app, ADMIN_EMAIL, 'mauvais');
    await login(app);

    const actions = fakeAuth.audit.map((entry) => entry.action);
    expect(actions).toContain('auth.login_failed');
    expect(actions).toContain('auth.login');

    const serialized = JSON.stringify(fakeAuth.audit);
    expect(serialized).not.toContain(ADMIN_PASSWORD);
    expect(serialized).not.toContain('mauvais');
    expect(serialized).not.toContain(ADMIN_EMAIL);
  });
});
