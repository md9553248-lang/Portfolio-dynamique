import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminApiError, adminRequest } from './adminApi';

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubFetch(response: Partial<Response> & { json?: () => Promise<unknown> }) {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('adminRequest', () => {
  it('lit la réponse et envoie le cookie de session', async () => {
    const fetchMock = stubFetch({ ok: true, status: 200, json: async () => ({ data: { valeur: 1 } }) });
    await expect(adminRequest('GET', '/api/admin/x', { csrfToken: 'jeton' })).resolves.toEqual({ valeur: 1 });
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: 'GET', credentials: 'same-origin' });
  });

  it('ajoute le jeton CSRF seulement pour les requêtes qui modifient des données', async () => {
    const fetchMock = stubFetch({ ok: true, status: 200, json: async () => ({ data: null }) });
    await adminRequest('GET', '/a', { csrfToken: 'jeton' });
    await adminRequest('POST', '/b', { csrfToken: 'jeton' });
    await adminRequest('DELETE', '/c', { csrfToken: null });

    const headersOf = (index: number) => (fetchMock.mock.calls[index]?.[1] as RequestInit).headers as Record<string, string>;
    expect(headersOf(0)['X-CSRF-Token']).toBeUndefined();
    expect(headersOf(1)['X-CSRF-Token']).toBe('jeton');
    expect(headersOf(2)['X-CSRF-Token']).toBeUndefined();
  });

  it('envoie un corps JSON avec le bon en-tête', async () => {
    const fetchMock = stubFetch({ ok: true, status: 200, json: async () => ({ data: null }) });
    await adminRequest('PATCH', '/x', { csrfToken: 'jeton', json: { altText: 'Logo' } });
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(init.body).toBe('{"altText":"Logo"}');
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });

  it('transforme une erreur du serveur en AdminApiError avec le message en français', async () => {
    stubFetch({
      ok: false,
      status: 409,
      json: async () => ({ error: { code: 'CV_PUBLISHED', message: 'Ce CV est publié.', details: { x: 1 } } }),
    });
    const error = await adminRequest('DELETE', '/x', { csrfToken: 'jeton' }).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(AdminApiError);
    expect(error).toMatchObject({ status: 409, code: 'CV_PUBLISHED', message: 'Ce CV est publié.', details: { x: 1 } });
  });

  it('gère une réponse d’erreur qui n’est pas du JSON', async () => {
    stubFetch({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error('pas du JSON');
      },
    });
    await expect(adminRequest('GET', '/x', { csrfToken: null })).rejects.toMatchObject({
      status: 500,
      message: 'La demande a échoué.',
    });
  });

  it('signale une coupure réseau', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('réseau')));
    await expect(adminRequest('GET', '/x', { csrfToken: null })).rejects.toMatchObject({ status: 0 });
  });
});
