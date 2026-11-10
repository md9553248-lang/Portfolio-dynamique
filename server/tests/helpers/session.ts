import request from 'supertest';
import { ADMIN_EMAIL, ADMIN_PASSWORD, CLIENT_ORIGIN, COOKIE_NAME, type createTestApp } from './fakes.js';

type TestApp = ReturnType<typeof createTestApp>['app'];

export interface AdminSession {
  cookie: string;
  csrf: string;
}

/** Ouvre une session administrateur (comme le ferait le navigateur). */
export async function openAdminSession(app: TestApp): Promise<AdminSession> {
  const res = await request(app)
    .post('/api/auth/login')
    .set('Origin', CLIENT_ORIGIN)
    .set('Content-Type', 'application/json')
    .send(JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }));
  const line = ((res.headers['set-cookie'] ?? []) as unknown as string[]).find((entry) => entry.startsWith(`${COOKIE_NAME}=`)) ?? '';
  return { cookie: line.split(';')[0] ?? '', csrf: String(res.body.data.csrfToken) };
}

/** Ajoute à une requête la session, l'origine et le jeton CSRF d'un administrateur connecté. */
export function asAdmin<T extends request.Test>(test: T, session: AdminSession): T {
  return test.set('Cookie', session.cookie).set('Origin', CLIENT_ORIGIN).set('X-CSRF-Token', session.csrf) as T;
}
