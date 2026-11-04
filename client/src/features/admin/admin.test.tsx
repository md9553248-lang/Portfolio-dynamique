import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../App';

const USER = { id: 1, email: 'admin@exemple.com', displayName: 'Administrateur Test', role: 'admin' };

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(headers),
    json: async () => body,
  } as unknown as Response;
}

type Routes = Record<string, () => Response | Promise<Response>>;

/** Faux fetch : une réponse par « MÉTHODE /adresse ». Tout appel imprévu fait échouer le test. */
function mockFetch(routes: Routes) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const key = `${init?.method ?? 'GET'} ${url}`;
    const handler = routes[key];
    if (!handler) throw new Error(`Appel inattendu : ${key}`);
    return handler();
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const ME_ANONYMOUS = { 'GET /api/auth/me': () => jsonResponse(401, { error: { code: 'UNAUTHENTICATED' } }) };
const ME_LOGGED_IN = {
  'GET /api/auth/me': () => jsonResponse(200, { data: { user: USER, csrfToken: 'csrf-123' } }),
};

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

function fillAndSubmit(email = 'admin@exemple.com', password = 'un-mot-de-passe') {
  fireEvent.change(screen.getByLabelText(/Adresse e-mail/), { target: { value: email } });
  fireEvent.change(screen.getByLabelText(/Mot de passe/), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: 'Se connecter' }));
}

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Espace d’administration', () => {
  it('renvoie un visiteur non connecté vers la page de connexion', async () => {
    mockFetch(ME_ANONYMOUS);
    renderAt('/admin');
    expect(await screen.findByRole('heading', { level: 1, name: 'Connexion' })).toBeTruthy();
  });

  it('masque le mot de passe pendant la saisie', async () => {
    mockFetch(ME_ANONYMOUS);
    renderAt('/admin/connexion');
    const field = await screen.findByLabelText(/Mot de passe/);
    expect(field.getAttribute('type')).toBe('password');
  });

  it('connecte l’administrateur et affiche l’administration', async () => {
    const fetchMock = mockFetch({
      ...ME_ANONYMOUS,
      'POST /api/auth/login': () => jsonResponse(200, { data: { user: USER, csrfToken: 'csrf-123' } }),
    });
    renderAt('/admin/connexion');
    await screen.findByRole('heading', { name: 'Connexion' });

    fillAndSubmit();

    expect(await screen.findByRole('heading', { level: 1, name: 'Administration' })).toBeTruthy();
    expect(screen.getByText(/Connecté en tant que Administrateur Test/)).toBeTruthy();

    const loginCall = fetchMock.mock.calls.find(([url]) => url === '/api/auth/login');
    expect(JSON.parse(String(loginCall?.[1]?.body))).toEqual({
      email: 'admin@exemple.com',
      password: 'un-mot-de-passe',
    });
  });

  it('n’écrit ni session ni jeton dans le stockage du navigateur', async () => {
    mockFetch({
      ...ME_ANONYMOUS,
      'POST /api/auth/login': () => jsonResponse(200, { data: { user: USER, csrfToken: 'csrf-123' } }),
    });
    renderAt('/admin/connexion');
    await screen.findByRole('heading', { name: 'Connexion' });
    fillAndSubmit();
    await screen.findByRole('heading', { name: 'Administration' });

    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });

  it('affiche un message unique pour des identifiants incorrects et vide le mot de passe', async () => {
    mockFetch({
      ...ME_ANONYMOUS,
      'POST /api/auth/login': () => jsonResponse(401, { error: { code: 'INVALID_CREDENTIALS' } }),
    });
    renderAt('/admin/connexion');
    await screen.findByRole('heading', { name: 'Connexion' });

    fillAndSubmit();

    expect((await screen.findByRole('alert')).textContent).toBe('Identifiants incorrects.');
    expect((screen.getByLabelText(/Mot de passe/) as HTMLInputElement).value).toBe('');
    expect(screen.queryByRole('heading', { name: 'Administration' })).toBeNull();
  });

  it('indique combien de temps attendre après trop de tentatives (429)', async () => {
    mockFetch({
      ...ME_ANONYMOUS,
      'POST /api/auth/login': () =>
        jsonResponse(429, { error: { code: 'TOO_MANY_ATTEMPTS' } }, { 'Retry-After': '90' }),
    });
    renderAt('/admin/connexion');
    await screen.findByRole('heading', { name: 'Connexion' });

    fillAndSubmit();

    expect((await screen.findByRole('alert')).textContent).toContain('2 minutes');
  });

  it('signale un serveur injoignable', async () => {
    mockFetch({
      ...ME_ANONYMOUS,
      'POST /api/auth/login': () => {
        throw new Error('réseau');
      },
    });
    renderAt('/admin/connexion');
    await screen.findByRole('heading', { name: 'Connexion' });

    fillAndSubmit();

    expect((await screen.findByRole('alert')).textContent).toContain('Impossible de joindre le serveur');
  });

  it('demande les deux champs avant tout envoi', async () => {
    const fetchMock = mockFetch(ME_ANONYMOUS);
    renderAt('/admin/connexion');
    await screen.findByRole('heading', { name: 'Connexion' });

    fireEvent.click(screen.getByRole('button', { name: 'Se connecter' }));

    expect((await screen.findByRole('alert')).textContent).toContain('Saisissez');
    expect(fetchMock).toHaveBeenCalledTimes(1); // seulement la vérification de session
  });

  it('affiche directement l’administration quand la session est déjà valide', async () => {
    mockFetch(ME_LOGGED_IN);
    renderAt('/admin');
    expect(await screen.findByRole('heading', { level: 1, name: 'Administration' })).toBeTruthy();
  });

  it('renvoie vers l’administration quand on ouvre la connexion déjà connecté', async () => {
    mockFetch(ME_LOGGED_IN);
    renderAt('/admin/connexion');
    expect(await screen.findByRole('heading', { level: 1, name: 'Administration' })).toBeTruthy();
  });

  it('se déconnecte avec le jeton CSRF puis revient à la connexion', async () => {
    const fetchMock = mockFetch({
      ...ME_LOGGED_IN,
      'POST /api/auth/logout': () => jsonResponse(200, { data: { loggedOut: true } }),
    });
    renderAt('/admin');
    await screen.findByRole('heading', { name: 'Administration' });

    fireEvent.click(screen.getByRole('button', { name: 'Se déconnecter' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Connexion' })).toBeTruthy();
    const logoutCall = fetchMock.mock.calls.find(([url]) => url === '/api/auth/logout');
    expect((logoutCall?.[1]?.headers as Record<string, string>)['X-CSRF-Token']).toBe('csrf-123');
  });

  it('reste connecté à l’écran si le serveur n’a pas confirmé la déconnexion', async () => {
    mockFetch({
      ...ME_LOGGED_IN,
      'POST /api/auth/logout': () => jsonResponse(500, { error: {} }),
    });
    renderAt('/admin');
    await screen.findByRole('heading', { name: 'Administration' });

    fireEvent.click(screen.getByRole('button', { name: 'Se déconnecter' }));

    expect((await screen.findByRole('alert')).textContent).toContain('déconnexion a échoué');
    expect(screen.getByRole('heading', { name: 'Administration' })).toBeTruthy();
  });

  it('signale un problème de vérification de session sans afficher l’administration', async () => {
    mockFetch({ 'GET /api/auth/me': () => jsonResponse(500, { error: {} }) });
    renderAt('/admin');
    expect((await screen.findByRole('alert')).textContent).toContain('Impossible de vérifier votre session');
    expect(screen.queryByRole('heading', { name: 'Administration' })).toBeNull();
  });

  it('n’interroge pas le serveur d’authentification sur les pages publiques', () => {
    const fetchMock = mockFetch({});
    renderAt('/');
    renderAt('/projets');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('demande aux moteurs de recherche de ne pas référencer l’administration', async () => {
    mockFetch(ME_ANONYMOUS);
    renderAt('/admin/connexion');
    await screen.findByRole('heading', { name: 'Connexion' });
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toContain('noindex');
  });
});
