import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeXhr } from '../../test/fakeXhr';
import {
  CSRF,
  callsTo,
  jsonResponse,
  mockFetch,
  renderAdminAt,
  SESSION_ROUTE,
  type Routes,
} from '../../test/adminTestUtils';

interface Version {
  id: number;
  status: 'draft' | 'published' | 'archived';
  originalName: string;
  sizeBytes: number;
  createdAt: string;
  publishedAt: string | null;
  fileUrl: string;
}

const version = (id: number, status: Version['status'], name: string): Version => ({
  id,
  status,
  originalName: name,
  sizeBytes: 2048,
  createdAt: '2026-10-30T10:00:00Z',
  publishedAt: status === 'published' ? '2026-10-31T12:00:00Z' : null,
  fileUrl: `/api/admin/cv/${id}/file`,
});

interface Overview {
  current: Version | null;
  draft: Version | null;
  archived: Version[];
  maxSizeMb: number;
}

function setup(initial: Partial<Overview> = {}, extra: Routes = {}) {
  const state = { overview: { current: null, draft: null, archived: [], maxSizeMb: 5, ...initial } as Overview };
  const fetchMock = mockFetch({
    ...SESSION_ROUTE,
    'GET /api/admin/cv': () => jsonResponse(200, { data: state.overview }),
    ...extra,
  });
  return { state, fetchMock };
}

const pdf = (name = 'nouveau.pdf', type = 'application/pdf') => new File(['%PDF-1.4 %%EOF'], name, { type });

beforeEach(() => {
  FakeXhr.reset();
  vi.stubGlobal('XMLHttpRequest', FakeXhr);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Gestion du CV : affichage', () => {
  it('montre le CV publié, ses informations et ses actions', async () => {
    setup({ current: version(3, 'published', 'cv-2026.pdf') });
    renderAdminAt('/admin/cv');

    expect(await screen.findByText('cv-2026.pdf')).toBeTruthy();
    expect(screen.getByText('En ligne')).toBeTruthy();
    expect(screen.getByText(/publié le/)).toBeTruthy();
    expect(screen.getByText(/2 Ko/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Télécharger' }).getAttribute('href')).toBe('/api/admin/cv/3/file?download=1');
    expect(screen.getByRole('link', { name: 'Ouvrir dans un nouvel onglet' }).getAttribute('rel')).toContain('noopener');
    expect(screen.getByRole('button', { name: 'Masquer le CV' })).toBeTruthy();
  });

  it('explique que le bouton est masqué quand aucun CV n’est publié', async () => {
    setup();
    renderAdminAt('/admin/cv');
    expect(await screen.findByText(/Aucun CV n’est publié/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Masquer le CV' })).toBeNull();
  });

  it('indique la taille maximale acceptée', async () => {
    setup();
    renderAdminAt('/admin/cv');
    expect(await screen.findByText(/maximum 5 Mo/)).toBeTruthy();
  });

  it('affiche un message clair si le chargement échoue', async () => {
    mockFetch({
      ...SESSION_ROUTE,
      'GET /api/admin/cv': () => jsonResponse(500, { error: { message: 'Une erreur interne est survenue.' } }),
    });
    renderAdminAt('/admin/cv');
    expect((await screen.findByRole('alert')).textContent).toContain('Une erreur interne est survenue.');
  });
});

describe('Gestion du CV : import', () => {
  async function chooseFile(file: File) {
    const input = (await screen.findByLabelText(/Fichier PDF/)) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
  }

  it('envoie le PDF avec le jeton CSRF, montre la progression, puis affiche le brouillon avec son aperçu', async () => {
    const { state } = setup({ current: version(3, 'published', 'cv-2026.pdf') });
    renderAdminAt('/admin/cv');

    await chooseFile(pdf());
    fireEvent.click(screen.getByRole('button', { name: 'Importer' }));

    const xhr = FakeXhr.last();
    expect(xhr.method).toBe('POST');
    expect(xhr.url).toBe('/api/admin/cv');
    expect(xhr.headers['X-CSRF-Token']).toBe(CSRF);
    expect(((xhr.body as FormData).get('file') as File).name).toBe('nouveau.pdf');

    xhr.progress(50, 100);
    const bar = await screen.findByRole('progressbar', { name: 'Progression de l’envoi' });
    expect(bar.getAttribute('value')).toBe('50');
    expect(screen.getByText('Envoi en cours : 50 %')).toBeTruthy();

    state.overview.draft = version(9, 'draft', 'nouveau.pdf');
    xhr.respond(201, { data: state.overview.draft });

    expect(await screen.findByText(/Nouvelle version importée/)).toBeTruthy();
    const preview = await screen.findByTitle('Aperçu de la version importée');
    expect(preview.getAttribute('src')).toBe('/api/admin/cv/9/file');
    expect(screen.getByRole('button', { name: 'Publier cette version' })).toBeTruthy();
    expect(screen.getByText(/remplacera le CV actuellement en ligne/)).toBeTruthy();
    // Le CV publié n'a pas bougé.
    expect(screen.getByText('cv-2026.pdf')).toBeTruthy();
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('affiche le message du serveur quand l’envoi est refusé (fichier trop gros)', async () => {
    setup({ current: version(3, 'published', 'cv-2026.pdf') });
    renderAdminAt('/admin/cv');

    await chooseFile(pdf());
    fireEvent.click(screen.getByRole('button', { name: 'Importer' }));
    FakeXhr.last().respond(413, {
      error: { code: 'FILE_TOO_LARGE', message: 'Le fichier dépasse la taille maximale autorisée (5 Mo).' },
    });

    expect((await screen.findByRole('alert')).textContent).toContain('dépasse la taille maximale');
    expect(screen.queryByTitle('Aperçu de la version importée')).toBeNull();
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.getByText('cv-2026.pdf')).toBeTruthy(); // le CV publié est intact
  });

  it('affiche le message du serveur pour un faux PDF', async () => {
    setup();
    renderAdminAt('/admin/cv');
    await chooseFile(pdf('faux.pdf'));
    fireEvent.click(screen.getByRole('button', { name: 'Importer' }));
    FakeXhr.last().respond(400, { error: { code: 'INVALID_FILE_TYPE', message: 'Le CV doit être un fichier PDF valide.' } });
    expect((await screen.findByRole('alert')).textContent).toContain('PDF valide');
  });

  it('signale une coupure réseau pendant l’envoi', async () => {
    setup();
    renderAdminAt('/admin/cv');
    await chooseFile(pdf());
    fireEvent.click(screen.getByRole('button', { name: 'Importer' }));
    FakeXhr.last().fail();
    expect((await screen.findByRole('alert')).textContent).toContain('Impossible de joindre le serveur');
  });

  it('refuse sans envoyer un fichier qui n’est pas un PDF', async () => {
    setup();
    renderAdminAt('/admin/cv');
    await chooseFile(new File(['x'], 'photo.png', { type: 'image/png' }));
    fireEvent.click(screen.getByRole('button', { name: 'Importer' }));
    expect((await screen.findByRole('alert')).textContent).toBe('Choisissez un fichier PDF.');
    expect(FakeXhr.instances).toHaveLength(0);
  });

  it('refuse sans envoyer un fichier trop volumineux', async () => {
    setup();
    renderAdminAt('/admin/cv');
    await chooseFile(new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'gros.pdf', { type: 'application/pdf' }));
    fireEvent.click(screen.getByRole('button', { name: 'Importer' }));
    expect((await screen.findByRole('alert')).textContent).toContain('dépasse la taille maximale');
    expect(FakeXhr.instances).toHaveLength(0);
  });

  it('demande de choisir un fichier avant d’importer', async () => {
    setup();
    renderAdminAt('/admin/cv');
    fireEvent.click(await screen.findByRole('button', { name: 'Importer' }));
    expect((await screen.findByRole('alert')).textContent).toBe('Choisissez d’abord un fichier PDF.');
    expect(FakeXhr.instances).toHaveLength(0);
  });

  it('renvoie à la connexion si la session a expiré pendant l’envoi', async () => {
    setup();
    renderAdminAt('/admin/cv');
    await chooseFile(pdf());
    fireEvent.click(screen.getByRole('button', { name: 'Importer' }));
    FakeXhr.last().respond(401, { error: { code: 'UNAUTHENTICATED', message: 'Authentification requise.' } });
    expect(await screen.findByRole('heading', { level: 1, name: 'Connexion' })).toBeTruthy();
  });
});

describe('Gestion du CV : publication, masquage, suppression', () => {
  it('publie le brouillon avec le jeton CSRF, puis il devient le CV en ligne', async () => {
    const draft = version(9, 'draft', 'nouveau.pdf');
    const { state, fetchMock } = setup({ current: version(3, 'published', 'ancien.pdf'), draft }, {
      'POST /api/admin/cv/9/publish': () => {
        state.overview = { current: version(9, 'published', 'nouveau.pdf'), draft: null, archived: [version(3, 'archived', 'ancien.pdf')], maxSizeMb: 5 };
        return jsonResponse(200, { data: state.overview.current });
      },
    });
    renderAdminAt('/admin/cv');

    fireEvent.click(await screen.findByRole('button', { name: 'Publier cette version' }));

    expect(await screen.findByText(/Nouvelle version publiée/)).toBeTruthy();
    const [call] = callsTo(fetchMock, 'POST', '/api/admin/cv/9/publish');
    expect(((call?.[1] as RequestInit).headers as Record<string, string>)['X-CSRF-Token']).toBe(CSRF);
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Publier cette version' })).toBeNull());
    expect(screen.getByText('nouveau.pdf')).toBeTruthy();
    expect(screen.getByText('Archivée')).toBeTruthy();
  });

  it('annule un import seulement après confirmation', async () => {
    const { state, fetchMock } = setup({ draft: version(9, 'draft', 'nouveau.pdf') }, {
      'DELETE /api/admin/cv/9': () => {
        state.overview.draft = null;
        return jsonResponse(200, { data: { deleted: true } });
      },
    });
    renderAdminAt('/admin/cv');

    fireEvent.click(await screen.findByRole('button', { name: 'Annuler l’import' }));
    expect(callsTo(fetchMock, 'DELETE', '/api/admin/cv/9')).toHaveLength(0); // pas encore

    fireEvent.click(screen.getByRole('button', { name: 'Confirmer l’annulation' }));
    expect(await screen.findByText(/Import annulé/)).toBeTruthy();
    expect(callsTo(fetchMock, 'DELETE', '/api/admin/cv/9')).toHaveLength(1);
    await waitFor(() => expect(screen.queryByTitle('Aperçu de la version importée')).toBeNull());
  });

  it('peut revenir en arrière avant de confirmer', async () => {
    const { fetchMock } = setup({ draft: version(9, 'draft', 'nouveau.pdf') });
    renderAdminAt('/admin/cv');
    fireEvent.click(await screen.findByRole('button', { name: 'Annuler l’import' }));
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(screen.getByRole('button', { name: 'Annuler l’import' })).toBeTruthy();
    expect(callsTo(fetchMock, 'DELETE', '/api/admin/cv/9')).toHaveLength(0);
  });

  it('masque le CV publié', async () => {
    const { state, fetchMock } = setup({ current: version(3, 'published', 'cv.pdf') }, {
      'POST /api/admin/cv/unpublish': () => {
        state.overview = { current: null, draft: null, archived: [version(3, 'archived', 'cv.pdf')], maxSizeMb: 5 };
        return jsonResponse(200, { data: { published: false } });
      },
    });
    renderAdminAt('/admin/cv');

    fireEvent.click(await screen.findByRole('button', { name: 'Masquer le CV' }));

    expect(await screen.findByText(/CV masqué/)).toBeTruthy();
    expect(callsTo(fetchMock, 'POST', '/api/admin/cv/unpublish')).toHaveLength(1);
    expect(await screen.findByText(/Aucun CV n’est publié/)).toBeTruthy();
  });

  it('republie et supprime une ancienne version', async () => {
    const { state, fetchMock } = setup({ archived: [version(2, 'archived', 'v2.pdf')] }, {
      'POST /api/admin/cv/2/publish': () => {
        state.overview = { current: version(2, 'published', 'v2.pdf'), draft: null, archived: [], maxSizeMb: 5 };
        return jsonResponse(200, { data: state.overview.current });
      },
    });
    renderAdminAt('/admin/cv');

    const archived = (await screen.findByText('v2.pdf')).closest('li') as HTMLElement;
    expect(within(archived).getByRole('link', { name: 'Télécharger' }).getAttribute('href')).toBe('/api/admin/cv/2/file?download=1');
    expect(within(archived).getByRole('button', { name: 'Supprimer' })).toBeTruthy();

    fireEvent.click(within(archived).getByRole('button', { name: 'Republier' }));
    expect(await screen.findByText(/Version republiée/)).toBeTruthy();
    expect(callsTo(fetchMock, 'POST', '/api/admin/cv/2/publish')).toHaveLength(1);
  });

  it('affiche le message du serveur quand une action est refusée', async () => {
    setup({ current: version(3, 'published', 'cv.pdf') }, {
      'POST /api/admin/cv/unpublish': () =>
        jsonResponse(409, { error: { code: 'NO_PUBLISHED_CV', message: 'Aucun CV n’est publié actuellement.' } }),
    });
    renderAdminAt('/admin/cv');
    fireEvent.click(await screen.findByRole('button', { name: 'Masquer le CV' }));
    expect((await screen.findByRole('alert')).textContent).toBe('Aucun CV n’est publié actuellement.');
  });

  it('renvoie à la connexion quand la session a expiré pendant une action', async () => {
    setup({ draft: version(9, 'draft', 'nouveau.pdf') }, {
      'POST /api/admin/cv/9/publish': () => jsonResponse(401, { error: { code: 'UNAUTHENTICATED', message: 'Authentification requise.' } }),
    });
    renderAdminAt('/admin/cv');
    fireEvent.click(await screen.findByRole('button', { name: 'Publier cette version' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Connexion' })).toBeTruthy();
  });
});
