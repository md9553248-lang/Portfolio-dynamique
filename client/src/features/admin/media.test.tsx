import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeXhr } from '../../test/fakeXhr';
import { CSRF, callsTo, jsonResponse, mockFetch, renderAdminAt, SESSION_ROUTE, type Routes } from '../../test/adminTestUtils';

interface Item {
  id: number;
  url: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  visibility: 'public' | 'private';
  altText: string | null;
  kind: 'image' | 'document';
  createdAt: string;
}

const IMAGE: Item = {
  id: 1,
  url: '/api/public/media/aaaa',
  originalName: 'logo.png',
  mimeType: 'image/png',
  sizeBytes: 3 * 1024,
  visibility: 'public',
  altText: 'Logo du projet',
  kind: 'image',
  createdAt: '2026-10-31T10:00:00Z',
};
const DOCUMENT: Item = {
  id: 2,
  url: '/api/admin/media/2/file',
  originalName: 'diplome.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 1024 * 1024 * 1.5,
  visibility: 'private',
  altText: null,
  kind: 'document',
  createdAt: '2026-10-31T10:00:00Z',
};

function setup(items: Item[], extra: Routes = {}) {
  const state = { items };
  const fetchMock = mockFetch({
    ...SESSION_ROUTE,
    'GET /api/admin/media': () => jsonResponse(200, { data: state.items }),
    ...extra,
  });
  return { state, fetchMock };
}

beforeEach(() => {
  FakeXhr.reset();
  vi.stubGlobal('XMLHttpRequest', FakeXhr);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function itemRow(name: string): Promise<HTMLElement> {
  return (await screen.findByText(name)).closest('li') as HTMLElement;
}

describe('Médias : liste', () => {
  it('affiche les fichiers avec leur aperçu, leur visibilité et leur taille', async () => {
    setup([IMAGE, DOCUMENT]);
    renderAdminAt('/admin/medias');

    const image = await itemRow('logo.png');
    expect(within(image).getByAltText('Logo du projet').getAttribute('src')).toBe('/api/public/media/aaaa');
    expect(within(image).getByText('Public')).toBeTruthy();
    expect(within(image).getByText('3 Ko')).toBeTruthy();

    const document = await itemRow('diplome.pdf');
    expect(within(document).getByText('Privé')).toBeTruthy();
    expect(within(document).getByText('1,5 Mo')).toBeTruthy();
    expect(within(document).queryByRole('img')).toBeNull();
  });

  it('utilise le nom du fichier quand il n’y a pas de texte alternatif', async () => {
    setup([{ ...IMAGE, altText: null }]);
    renderAdminAt('/admin/medias');
    expect(await screen.findByAltText('logo.png')).toBeTruthy();
  });

  it('indique quand la médiathèque est vide', async () => {
    setup([]);
    renderAdminAt('/admin/medias');
    expect(await screen.findByText('Aucun fichier pour le moment.')).toBeTruthy();
  });
});

describe('Médias : import', () => {
  it('envoie le fichier avec son texte alternatif et sa visibilité, puis recharge la liste', async () => {
    const { state } = setup([]);
    renderAdminAt('/admin/medias');

    fireEvent.change(await screen.findByLabelText(/Image \(JPEG/), {
      target: { files: [new File(['x'], 'photo.jpg', { type: 'image/jpeg' })] },
    });
    fireEvent.change(screen.getByLabelText(/Texte alternatif \(décrit/), { target: { value: '  Une photo  ' } });
    fireEvent.change(screen.getByLabelText('Visibilité'), { target: { value: 'private' } });
    fireEvent.click(screen.getByRole('button', { name: 'Importer' }));

    const xhr = FakeXhr.last();
    expect(xhr.method).toBe('POST');
    expect(xhr.url).toBe('/api/admin/media');
    expect(xhr.headers['X-CSRF-Token']).toBe(CSRF);
    const form = xhr.body as FormData;
    expect(form.get('altText')).toBe('Une photo');
    expect(form.get('visibility')).toBe('private');
    expect((form.get('file') as File).name).toBe('photo.jpg');

    xhr.progress(30, 100);
    expect(await screen.findByText('Envoi en cours : 30 %')).toBeTruthy();

    state.items = [{ ...IMAGE, originalName: 'photo.jpg', altText: 'Une photo', visibility: 'private' }];
    xhr.respond(201, { data: state.items[0] });
    expect(await screen.findByText('Fichier importé.')).toBeTruthy();
    expect(await itemRow('photo.jpg')).toBeTruthy();
  });

  it('n’envoie ni texte ni visibilité quand ils ne sont pas renseignés', async () => {
    setup([]);
    renderAdminAt('/admin/medias');
    fireEvent.change(await screen.findByLabelText(/Image \(JPEG/), {
      target: { files: [new File(['x'], 'photo.jpg', { type: 'image/jpeg' })] },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Importer' }));
    const form = FakeXhr.last().body as FormData;
    expect(form.get('altText')).toBeNull();
    expect(form.get('visibility')).toBeNull();
  });

  it('demande de choisir un fichier avant d’importer', async () => {
    setup([]);
    renderAdminAt('/admin/medias');
    fireEvent.click(await screen.findByRole('button', { name: 'Importer' }));
    expect((await screen.findByRole('alert')).textContent).toBe('Choisissez d’abord un fichier.');
    expect(FakeXhr.instances).toHaveLength(0);
  });

  it('affiche le message du serveur quand le type de fichier est refusé', async () => {
    setup([]);
    renderAdminAt('/admin/medias');
    fireEvent.change(await screen.findByLabelText(/Image \(JPEG/), {
      target: { files: [new File(['<svg/>'], 'logo.png', { type: 'image/png' })] },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Importer' }));
    FakeXhr.last().respond(400, {
      error: { code: 'INVALID_FILE_TYPE', message: 'Type de fichier non autorisé. Formats acceptés : PDF, JPEG, PNG, WebP ou AVIF.' },
    });
    expect((await screen.findByRole('alert')).textContent).toContain('Type de fichier non autorisé');
  });
});

describe('Médias : modification et suppression', () => {
  it('enregistre le texte alternatif et la visibilité', async () => {
    const { fetchMock } = setup([IMAGE], {
      'PATCH /api/admin/media/1': () => jsonResponse(200, { data: IMAGE }),
    });
    renderAdminAt('/admin/medias');

    const row = await itemRow('logo.png');
    fireEvent.change(within(row).getByLabelText('Texte alternatif (logo.png)'), { target: { value: 'Nouveau texte' } });
    fireEvent.change(within(row).getByLabelText('Visibilité (logo.png)'), { target: { value: 'private' } });
    fireEvent.click(within(row).getByRole('button', { name: 'Enregistrer' }));

    expect(await screen.findByText('Modifications enregistrées.')).toBeTruthy();
    const [call] = callsTo(fetchMock, 'PATCH', '/api/admin/media/1');
    const init = call?.[1] as RequestInit;
    expect(JSON.parse(String(init.body))).toEqual({ altText: 'Nouveau texte', visibility: 'private' });
    expect((init.headers as Record<string, string>)['X-CSRF-Token']).toBe(CSRF);
  });

  it('envoie null quand le texte alternatif est vidé', async () => {
    const { fetchMock } = setup([IMAGE], { 'PATCH /api/admin/media/1': () => jsonResponse(200, { data: IMAGE }) });
    renderAdminAt('/admin/medias');
    const row = await itemRow('logo.png');
    fireEvent.change(within(row).getByLabelText('Texte alternatif (logo.png)'), { target: { value: '   ' } });
    fireEvent.click(within(row).getByRole('button', { name: 'Enregistrer' }));
    await screen.findByText('Modifications enregistrées.');
    const [call] = callsTo(fetchMock, 'PATCH', '/api/admin/media/1');
    expect(JSON.parse(String((call?.[1] as RequestInit).body)).altText).toBeNull();
  });

  it('supprime un fichier seulement après confirmation', async () => {
    const { state, fetchMock } = setup([IMAGE], {
      'DELETE /api/admin/media/1': () => {
        state.items = [];
        return jsonResponse(200, { data: { deleted: true } });
      },
    });
    renderAdminAt('/admin/medias');

    const row = await itemRow('logo.png');
    fireEvent.click(within(row).getByRole('button', { name: 'Supprimer' }));
    expect(callsTo(fetchMock, 'DELETE', '/api/admin/media/1')).toHaveLength(0);

    fireEvent.click(within(row).getByRole('button', { name: 'Confirmer la suppression' }));
    expect(await screen.findByText('Fichier supprimé.')).toBeTruthy();
    expect(await screen.findByText('Aucun fichier pour le moment.')).toBeTruthy();
  });

  it('explique où un fichier encore utilisé est employé', async () => {
    setup([IMAGE], {
      'DELETE /api/admin/media/1': () =>
        jsonResponse(409, {
          error: {
            code: 'MEDIA_IN_USE',
            message: 'Ce fichier est encore utilisé.',
            details: { usages: [{ where: 'Projet (image principale)', label: 'api-gestion-stock' }] },
          },
        }),
    });
    renderAdminAt('/admin/medias');

    const row = await itemRow('logo.png');
    fireEvent.click(within(row).getByRole('button', { name: 'Supprimer' }));
    fireEvent.click(within(row).getByRole('button', { name: 'Confirmer la suppression' }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Projet (image principale) (api-gestion-stock)');
    expect(screen.getByText('logo.png')).toBeTruthy(); // le fichier est toujours là
  });

  it('remplace le contenu d’un fichier en gardant son identifiant', async () => {
    setup([IMAGE]);
    renderAdminAt('/admin/medias');

    const row = await itemRow('logo.png');
    fireEvent.change(within(row).getByLabelText('Remplacer le fichier logo.png'), {
      target: { files: [new File(['x'], 'neuf.png', { type: 'image/png' })] },
    });

    const xhr = FakeXhr.last();
    expect(xhr.method).toBe('PUT');
    expect(xhr.url).toBe('/api/admin/media/1/file');
    expect(xhr.headers['X-CSRF-Token']).toBe(CSRF);
    xhr.respond(200, { data: { ...IMAGE, url: '/api/public/media/bbbb' } });
    expect(await screen.findByText('Fichier remplacé.')).toBeTruthy();
  });
});
