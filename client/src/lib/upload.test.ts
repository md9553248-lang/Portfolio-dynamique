import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminApiError } from './adminApi';
import { uploadFile } from './upload';
import { FakeXhr } from '../test/fakeXhr';

beforeEach(() => {
  FakeXhr.reset();
  vi.stubGlobal('XMLHttpRequest', FakeXhr);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const file = () => new File(['%PDF-'], 'cv.pdf', { type: 'application/pdf' });

describe('uploadFile', () => {
  it('envoie le fichier et les champs en multipart, avec le cookie de session et le jeton CSRF', () => {
    void uploadFile({ url: '/api/admin/media', file: file(), fields: { altText: 'Logo' }, csrfToken: 'jeton' }).catch(() => {});
    const xhr = FakeXhr.last();

    expect(xhr.method).toBe('POST');
    expect(xhr.url).toBe('/api/admin/media');
    expect(xhr.withCredentials).toBe(true);
    expect(xhr.headers['X-CSRF-Token']).toBe('jeton');
    expect(xhr.headers['Content-Type']).toBeUndefined(); // le navigateur ajoute lui-même la séparation
    const body = xhr.body as FormData;
    expect(body.get('altText')).toBe('Logo');
    expect((body.get('file') as File).name).toBe('cv.pdf');
  });

  it('n’envoie pas de jeton CSRF s’il n’y en a pas, et accepte la méthode PUT', () => {
    void uploadFile({ url: '/x', method: 'PUT', file: file(), csrfToken: null }).catch(() => {});
    const xhr = FakeXhr.last();
    expect(xhr.method).toBe('PUT');
    expect(xhr.headers['X-CSRF-Token']).toBeUndefined();
  });

  it('signale la progression en pourcentage', () => {
    const progress: number[] = [];
    void uploadFile({ url: '/x', file: file(), csrfToken: null, onProgress: (value) => progress.push(value) }).catch(() => {});
    const xhr = FakeXhr.last();
    xhr.progress(0, 200);
    xhr.progress(50, 200);
    xhr.progress(200, 200);
    expect(progress).toEqual([0, 25, 100]);
  });

  it('renvoie le contenu « data » quand le serveur répond 201', async () => {
    const promise = uploadFile<{ id: number }>({ url: '/x', file: file(), csrfToken: null });
    FakeXhr.last().respond(201, { data: { id: 7 } });
    await expect(promise).resolves.toEqual({ id: 7 });
  });

  it('transforme une erreur du serveur en AdminApiError (code, message, détails)', async () => {
    const promise = uploadFile({ url: '/x', file: file(), csrfToken: null });
    FakeXhr.last().respond(409, { error: { code: 'MEDIA_IN_USE', message: 'Fichier utilisé.', details: { usages: [] } } });

    const error = await promise.catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(AdminApiError);
    expect(error).toMatchObject({ status: 409, code: 'MEDIA_IN_USE', message: 'Fichier utilisé.' });
  });

  it('donne un message générique quand la réponse n’est pas du JSON', async () => {
    const promise = uploadFile({ url: '/x', file: file(), csrfToken: null });
    const xhr = FakeXhr.last();
    xhr.status = 502;
    xhr.responseText = '<html>Bad gateway</html>';
    xhr.onload?.();
    await expect(promise).rejects.toMatchObject({ status: 502, message: 'L’envoi a échoué.' });
  });

  it('signale une coupure réseau', async () => {
    const promise = uploadFile({ url: '/x', file: file(), csrfToken: null });
    FakeXhr.last().fail();
    await expect(promise).rejects.toMatchObject({ status: 0 });
  });
});
