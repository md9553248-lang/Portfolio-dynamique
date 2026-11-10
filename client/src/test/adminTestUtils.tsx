import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import App from '../App';

export const USER = { id: 1, email: 'admin@exemple.com', displayName: 'Administrateur Test', role: 'admin' };
export const CSRF = 'csrf-123';

export function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(headers),
    json: async () => body,
  } as unknown as Response;
}

export type Routes = Record<string, (init?: RequestInit) => Response | Promise<Response>>;

/** Faux fetch : une réponse par « MÉTHODE /adresse ». Tout appel imprévu fait échouer le test. */
export function mockFetch(routes: Routes) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const key = `${init?.method ?? 'GET'} ${url}`;
    const handler = routes[key];
    if (!handler) throw new Error(`Appel inattendu : ${key}`);
    return handler(init);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

/** Réponse de la session ouverte (le serveur reconnaît l'administrateur et renvoie son jeton CSRF). */
export const SESSION_ROUTE: Routes = {
  'GET /api/auth/me': () => jsonResponse(200, { data: { user: USER, csrfToken: CSRF } }),
};

export function renderAdminAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

/** Appels envoyés à une adresse avec une méthode donnée. */
export function callsTo(fetchMock: ReturnType<typeof mockFetch>, method: string, url: string) {
  return fetchMock.mock.calls.filter(([calledUrl, init]) => calledUrl === url && (init?.method ?? 'GET') === method);
}
