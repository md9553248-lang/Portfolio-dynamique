import { cleanup, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, mockFetch, renderAdminAt, SESSION_ROUTE } from '../../test/adminTestUtils';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const DASHBOARD = {
  projects: { published: 3, draft: 1 },
  articles: { published: 2, draft: 4 },
  messages: { total: 9, unread: 5 },
  media: { total: 12 },
  cv: { publishedAt: '2026-10-31T12:00:00Z' },
  security: { failedLogins24h: 7 },
  recentActivity: [
    { action: 'cv.publish', entityType: 'cv', createdAt: '2026-10-31T12:00:00Z', actor: 'Administrateur Test' },
    { action: 'action.inconnue', entityType: null, createdAt: '2026-10-30T09:00:00Z', actor: null },
  ],
};

describe('Cadre de l’administration', () => {
  it('affiche l’identité, la navigation et un lien d’accès rapide', async () => {
    mockFetch({ ...SESSION_ROUTE, 'GET /api/admin/dashboard': () => jsonResponse(200, { data: DASHBOARD }) });
    renderAdminAt('/admin');

    expect(await screen.findByRole('heading', { level: 1, name: 'Tableau de bord' })).toBeTruthy();
    expect(screen.getByText(/Connecté en tant que Administrateur Test/)).toBeTruthy();

    const nav = screen.getByRole('navigation', { name: 'Navigation de l’administration' });
    expect(within(nav).getByRole('link', { name: 'Tableau de bord' }).getAttribute('aria-current')).toBe('page');
    expect(within(nav).getByRole('link', { name: 'CV' }).getAttribute('href')).toBe('/admin/cv');
    expect(within(nav).getByRole('link', { name: 'Médias' }).getAttribute('href')).toBe('/admin/medias');
    expect(screen.getByRole('link', { name: 'Aller au contenu principal' })).toBeTruthy();
  });

  it('n’affiche pas la navigation du site public dans l’administration', async () => {
    mockFetch({ ...SESSION_ROUTE, 'GET /api/admin/dashboard': () => jsonResponse(200, { data: DASHBOARD }) });
    renderAdminAt('/admin');
    await screen.findByRole('heading', { name: 'Tableau de bord' });
    expect(screen.queryByRole('navigation', { name: 'Navigation principale' })).toBeNull();
  });
});

describe('Tableau de bord', () => {
  it('affiche les statistiques réelles renvoyées par le serveur', async () => {
    mockFetch({ ...SESSION_ROUTE, 'GET /api/admin/dashboard': () => jsonResponse(200, { data: DASHBOARD }) });
    renderAdminAt('/admin');

    const stats = await screen.findByRole('list', { name: 'Statistiques' });
    expect(within(stats).getByText('Projets publiés').nextElementSibling?.textContent).toBe('3');
    expect(within(stats).getByText('1 brouillon(s)')).toBeTruthy();
    expect(within(stats).getByText('4 brouillon(s)')).toBeTruthy();
    expect(within(stats).getByText('Messages reçus').nextElementSibling?.textContent).toBe('9');
    expect(within(stats).getByText('5 non lu(s)')).toBeTruthy();
    expect(within(stats).getByText('Fichiers en médiathèque').nextElementSibling?.textContent).toBe('12');
    expect(within(stats).getByText('Connexions échouées (24 h)').nextElementSibling?.textContent).toBe('7');
    expect(within(stats).getByText(/Publié le/)).toBeTruthy();
  });

  it('indique quand aucun CV n’est publié', async () => {
    mockFetch({
      ...SESSION_ROUTE,
      'GET /api/admin/dashboard': () => jsonResponse(200, { data: { ...DASHBOARD, cv: { publishedAt: null } } }),
    });
    renderAdminAt('/admin');
    expect(await screen.findByText('Aucun CV publié')).toBeTruthy();
  });

  it('traduit les actions de l’activité récente et affiche les autres telles quelles', async () => {
    mockFetch({ ...SESSION_ROUTE, 'GET /api/admin/dashboard': () => jsonResponse(200, { data: DASHBOARD }) });
    renderAdminAt('/admin');
    expect(await screen.findByText('CV publié')).toBeTruthy();
    expect(screen.getByText('action.inconnue')).toBeTruthy();
  });

  it('signale une activité vide', async () => {
    mockFetch({
      ...SESSION_ROUTE,
      'GET /api/admin/dashboard': () => jsonResponse(200, { data: { ...DASHBOARD, recentActivity: [] } }),
    });
    renderAdminAt('/admin');
    expect(await screen.findByText('Aucune activité pour le moment.')).toBeTruthy();
  });

  it('affiche une erreur claire si les statistiques ne se chargent pas', async () => {
    mockFetch({
      ...SESSION_ROUTE,
      'GET /api/admin/dashboard': () => jsonResponse(500, { error: { code: 'INTERNAL_ERROR', message: 'Une erreur interne est survenue.' } }),
    });
    renderAdminAt('/admin');
    expect((await screen.findByRole('alert')).textContent).toContain('Une erreur interne est survenue.');
  });
});
