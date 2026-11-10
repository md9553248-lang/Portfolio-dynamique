import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createTestApp } from '../helpers/fakes.js';
import { jpegBuffer, pdfBuffer, pngBuffer } from '../helpers/files.js';
import { binaryParser } from '../helpers/temp.js';
import { asAdmin, openAdminSession } from '../helpers/session.js';

describe('Images publiques', () => {
  async function publicImage() {
    const test = createTestApp();
    const session = await openAdminSession(test.app);
    const res = await asAdmin(request(test.app).post('/api/admin/media'), session).attach('file', pngBuffer(), 'logo.png');
    return { ...test, session, media: res.body.data as { id: number; url: string } };
  }

  it('sert une image publique avec le type réel, nosniff et un cache long', async () => {
    const { app, media } = await publicImage();
    const res = await request(app).get(media.url).buffer(true).parse(binaryParser);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('image/png');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['cache-control']).toBe('public, max-age=31536000, immutable');
    expect(res.headers['content-disposition']).toContain('inline');
    expect(res.headers['etag']).toBeDefined();
    expect((res.body as Buffer).equals(pngBuffer())).toBe(true);
  });

  it('répond 304 quand le navigateur a déjà la bonne version', async () => {
    const { app, media } = await publicImage();
    const first = await request(app).get(media.url);
    const second = await request(app).get(media.url).set('If-None-Match', String(first.headers['etag']));
    expect(second.status).toBe(304);
  });

  it('ne sert jamais un fichier privé, avec le même 404 qu’une adresse inconnue', async () => {
    const { app, session, media } = await publicImage();
    await asAdmin(request(app).patch(`/api/admin/media/${media.id}`), session)
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ visibility: 'private' }));

    const privateAttempt = await request(app).get(media.url);
    const unknown = await request(app).get(`/api/public/media/${randomUUID()}`);
    expect(privateAttempt.status).toBe(404);
    expect(unknown.status).toBe(404);
    expect(privateAttempt.body).toEqual(unknown.body);
  });

  it('refuse toute adresse qui n’est pas une clé aléatoire (aucun accès à un chemin quelconque)', async () => {
    const { app } = createTestApp();
    for (const key of ['..%2F..%2Fetc%2Fpasswd', '%2e%2e%2fsecret', 'cv.pdf', 'a'.repeat(300), '..\\..\\x']) {
      const res = await request(app).get(`/api/public/media/${key}`);
      expect(res.status, key).toBe(404);
    }
  });

  it('ne sert pas le fichier d’une version de CV via les adresses de médias', async () => {
    const { app, fakeFiles, storage } = createTestApp();
    const session = await openAdminSession(app);
    const upload = await asAdmin(request(app).post('/api/admin/cv'), session).attach('file', pdfBuffer(), 'cv.pdf');
    expect(upload.status).toBe(201);
    const stored = [...fakeFiles.media.values()][0];
    expect(await storage.exists(stored?.storageKey ?? '')).toBe(true);
    expect((await request(app).get(`/api/public/media/${stored?.storageKey}`)).status).toBe(404);
  });
});

describe('Téléchargement public du CV', () => {
  async function publishCv(test: ReturnType<typeof createTestApp>, content = pdfBuffer('% version A')) {
    const session = await openAdminSession(test.app);
    const upload = await asAdmin(request(test.app).post('/api/admin/cv'), session).attach('file', content, 'mon-cv.pdf');
    await asAdmin(request(test.app).post(`/api/admin/cv/${upload.body.data.id}/publish`), session);
    return { session, id: upload.body.data.id as number };
  }

  it('répond 404 tant qu’aucun CV n’est publié', async () => {
    const { app } = createTestApp();
    const res = await request(app).get('/api/public/cv/download');
    expect(res.status).toBe(404);
    expect((await request(app).get('/api/public/cv')).body.data).toEqual({ available: false, updatedAt: null });
  });

  it('un brouillon non publié n’est jamais accessible au public', async () => {
    const test = createTestApp();
    const session = await openAdminSession(test.app);
    await asAdmin(request(test.app).post('/api/admin/cv'), session).attach('file', pdfBuffer(), 'cv.pdf');
    expect((await request(test.app).get('/api/public/cv/download')).status).toBe(404);
  });

  it('sert le CV publié avec un nom de fichier fixe, nosniff et sans cache aveugle', async () => {
    const test = createTestApp();
    await publishCv(test);
    const res = await request(test.app).get('/api/public/cv/download');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.headers['content-disposition']).toContain('attachment');
    expect(res.headers['content-disposition']).toContain('CV-Mouhamed-Diagne.pdf');
    expect(res.headers['content-disposition']).not.toContain('mon-cv'); // jamais le nom envoyé par l'utilisateur
    expect(res.headers['cache-control']).toBe('no-cache');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['etag']).toBeDefined();
  });

  it('sert la NOUVELLE version dès sa publication, sans redéploiement ni ancien fichier en cache', async () => {
    const test = createTestApp();
    const { session } = await publishCv(test, pdfBuffer('% version A'));
    const download = () => request(test.app).get('/api/public/cv/download').buffer(true).parse(binaryParser);
    const before = await download();
    expect((before.body as Buffer).toString('latin1')).toContain('version A');

    const second = await asAdmin(request(test.app).post('/api/admin/cv'), session).attach('file', pdfBuffer('% version B'), 'cv2.pdf');
    // Tant que la nouvelle version n'est pas publiée, le public voit encore l'ancienne.
    expect(((await download()).body as Buffer).toString('latin1')).toContain('version A');

    await asAdmin(request(test.app).post(`/api/admin/cv/${second.body.data.id}/publish`), session);
    const after = await download();
    expect((after.body as Buffer).toString('latin1')).toContain('version B');
    expect(after.headers['etag']).not.toBe(before.headers['etag']);

    // Une copie en cache de l'ancienne version ne peut pas être revalidée avec succès.
    const stale = await request(test.app).get('/api/public/cv/download').set('If-None-Match', String(before.headers['etag']));
    expect(stale.status).toBe(200);
  });

  it('masque le CV quand on le dépublie : plus de téléchargement et état « indisponible »', async () => {
    const test = createTestApp();
    const { session } = await publishCv(test);
    expect((await request(test.app).get('/api/public/cv')).body.data.available).toBe(true);

    await asAdmin(request(test.app).post('/api/admin/cv/unpublish'), session);
    expect((await request(test.app).get('/api/public/cv/download')).status).toBe(404);
    expect((await request(test.app).get('/api/public/cv')).body.data.available).toBe(false);
  });

  it('ne sert pas les anciennes versions au public', async () => {
    const test = createTestApp();
    const { session, id } = await publishCv(test);
    await asAdmin(request(test.app).post('/api/admin/cv/unpublish'), session);
    const archivedFile = await request(test.app).get(`/api/admin/cv/${id}/file`);
    expect(archivedFile.status).toBe(401);
    expect((await request(test.app).get('/api/public/cv/download')).status).toBe(404);
  });

  it('accepte une JPEG publique comme n’importe quelle image', async () => {
    const test = createTestApp();
    const session = await openAdminSession(test.app);
    const res = await asAdmin(request(test.app).post('/api/admin/media'), session).attach('file', jpegBuffer(), 'p.jpg');
    expect((await request(test.app).get(res.body.data.url)).headers['content-type']).toContain('image/jpeg');
  });
});
