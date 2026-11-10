import path from 'node:path';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { CLIENT_ORIGIN, MEDIA_MAX_BYTES, createTestApp } from '../helpers/fakes.js';
import { exeBuffer, htmlBuffer, jpegBuffer, pdfBuffer, pdfWithJavaScript, pngBuffer, svgBuffer } from '../helpers/files.js';
import { asAdmin, openAdminSession } from '../helpers/session.js';
import { listFiles } from '../helpers/temp.js';

const storedFiles = listFiles;

describe('Médiathèque : accès', () => {
  it('refuse un anonyme sur toutes les routes', async () => {
    const { app } = createTestApp();
    expect((await request(app).get('/api/admin/media')).status).toBe(401);
    expect((await request(app).post('/api/admin/media').attach('file', pngBuffer(), 'a.png')).status).toBe(401);
    expect((await request(app).delete('/api/admin/media/1')).status).toBe(401);
    expect((await request(app).get('/api/admin/media/1/file')).status).toBe(401);
  });

  it('exige le jeton CSRF et l’origine pour téléverser, modifier ou supprimer', async () => {
    const { app } = createTestApp();
    const session = await openAdminSession(app);

    const noCsrf = await request(app)
      .post('/api/admin/media')
      .set('Cookie', session.cookie)
      .set('Origin', CLIENT_ORIGIN)
      .attach('file', pngBuffer(), 'a.png');
    expect(noCsrf.status).toBe(403);

    const foreign = await asAdmin(request(app).post('/api/admin/media'), session)
      .set('Origin', 'https://evil.example')
      .attach('file', pngBuffer(), 'a.png');
    expect(foreign.status).toBe(403);
    expect((await request(app).delete('/api/admin/media/1').set('Cookie', session.cookie)).status).toBe(403);
  });
});

describe('Médiathèque : téléversement', () => {
  it('enregistre une image, la range sous une clé aléatoire et la rend publique par défaut', async () => {
    const { app, storageDir } = createTestApp();
    const session = await openAdminSession(app);

    const res = await asAdmin(request(app).post('/api/admin/media'), session)
      .field('altText', 'Logo du projet')
      .attach('file', pngBuffer(), { filename: 'logo.png', contentType: 'image/png' });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      originalName: 'logo.png',
      mimeType: 'image/png',
      visibility: 'public',
      altText: 'Logo du projet',
      kind: 'image',
    });
    expect(res.body.data.url).toMatch(/^\/api\/public\/media\/[0-9a-f-]{36}$/);

    const files = storedFiles(storageDir);
    expect(files).toHaveLength(1);
    expect(path.basename(files[0] ?? '')).toMatch(/^[0-9a-f-]{36}$/); // jamais le nom d'origine
    expect(path.basename(files[0] ?? '')).not.toContain('logo');
  });

  it('range un PDF en privé par défaut et donne une adresse réservée aux administrateurs', async () => {
    const { app } = createTestApp();
    const session = await openAdminSession(app);
    const res = await asAdmin(request(app).post('/api/admin/media'), session).attach('file', pdfBuffer(), 'diplome.pdf');
    expect(res.status).toBe(201);
    expect(res.body.data.visibility).toBe('private');
    expect(res.body.data.url).toBe(`/api/admin/media/${res.body.data.id}/file`);
    expect(res.body.data.kind).toBe('document');
  });

  it('détermine le type d’après le contenu, pas d’après l’extension ni le type annoncé', async () => {
    const { app } = createTestApp();
    const session = await openAdminSession(app);

    // Une vraie image PNG envoyée avec un nom « .txt » et un faux type : acceptée comme PNG.
    const real = await asAdmin(request(app).post('/api/admin/media'), session).attach('file', pngBuffer(), {
      filename: 'note.txt',
      contentType: 'text/plain',
    });
    expect(real.status).toBe(201);
    expect(real.body.data.mimeType).toBe('image/png');

    // Du HTML, du SVG ou un exécutable déguisés en image : refusés.
    for (const [content, name] of [
      [htmlBuffer(), 'photo.png'],
      [svgBuffer(), 'photo.png'],
      [exeBuffer(), 'photo.jpg'],
    ] as const) {
      const res = await asAdmin(request(app).post('/api/admin/media'), session).attach('file', content, {
        filename: name,
        contentType: 'image/png',
      });
      expect(res.status, name).toBe(400);
      expect(res.body.error.code).toBe('INVALID_FILE_TYPE');
    }
  });

  it('refuse un PDF qui contient du JavaScript', async () => {
    const { app } = createTestApp();
    const session = await openAdminSession(app);
    const res = await asAdmin(request(app).post('/api/admin/media'), session).attach('file', pdfWithJavaScript(), 'x.pdf');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('UNSAFE_PDF');
  });

  it('refuse un fichier trop gros, un envoi sans fichier et un fichier vide', async () => {
    const { app, storageDir } = createTestApp();
    const session = await openAdminSession(app);

    const big = Buffer.concat([pngBuffer(), Buffer.alloc(MEDIA_MAX_BYTES + 10)]);
    const tooLarge = await asAdmin(request(app).post('/api/admin/media'), session).attach('file', big, 'gros.png');
    expect(tooLarge.status).toBe(413);
    expect(tooLarge.body.error.code).toBe('FILE_TOO_LARGE');

    const none = await asAdmin(request(app).post('/api/admin/media'), session).field('altText', 'rien');
    expect(none.status).toBe(400);
    expect(none.body.error.code).toBe('MISSING_FILE');

    const empty = await asAdmin(request(app).post('/api/admin/media'), session).attach('file', Buffer.alloc(0), 'vide.png');
    expect(empty.status).toBe(400);
    expect(storedFiles(storageDir)).toHaveLength(0);
  });

  it('refuse plusieurs fichiers ou un champ mal nommé', async () => {
    const { app } = createTestApp();
    const session = await openAdminSession(app);
    const two = await asAdmin(request(app).post('/api/admin/media'), session)
      .attach('file', pngBuffer(), 'a.png')
      .attach('file', pngBuffer(), 'b.png');
    expect(two.status).toBe(400);
    const wrongField = await asAdmin(request(app).post('/api/admin/media'), session).attach('document', pngBuffer(), 'a.png');
    expect(wrongField.status).toBe(400);
  });

  it('nettoie le nom d’origine (chemin, caractères de contrôle)', async () => {
    const { app } = createTestApp();
    const session = await openAdminSession(app);
    const res = await asAdmin(request(app).post('/api/admin/media'), session).attach('file', jpegBuffer(), {
      filename: '../../evasion/photo.jpg',
      contentType: 'image/jpeg',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.originalName).toBe('photo.jpg');
  });

  it('retire le fichier du stockage si l’enregistrement en base échoue', async () => {
    const { app, storageDir, fakeFiles } = createTestApp();
    const session = await openAdminSession(app);
    fakeFiles.failures.insertMedia = true;

    const res = await asAdmin(request(app).post('/api/admin/media'), session).attach('file', pngBuffer(), 'a.png');
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain('Panne simulée');
    expect(storedFiles(storageDir)).toHaveLength(0);
  });

  it('inscrit l’action dans le journal d’audit', async () => {
    const { app, fakeFiles } = createTestApp();
    const session = await openAdminSession(app);
    await asAdmin(request(app).post('/api/admin/media'), session).attach('file', pngBuffer(), 'a.png');
    expect(fakeFiles.audit.map((entry) => entry.action)).toContain('media.upload');
  });
});

describe('Médiathèque : gestion', () => {
  async function upload(app: ReturnType<typeof createTestApp>['app'], session: Awaited<ReturnType<typeof openAdminSession>>) {
    const res = await asAdmin(request(app).post('/api/admin/media'), session).attach('file', pngBuffer(), 'a.png');
    return res.body.data as { id: number; url: string };
  }

  it('liste les fichiers et filtre par genre', async () => {
    const { app } = createTestApp();
    const session = await openAdminSession(app);
    await upload(app, session);
    await asAdmin(request(app).post('/api/admin/media'), session).attach('file', pdfBuffer(), 'd.pdf');

    const all = await asAdmin(request(app).get('/api/admin/media'), session);
    expect(all.body.data).toHaveLength(2);
    const images = await asAdmin(request(app).get('/api/admin/media?kind=image'), session);
    expect(images.body.data).toHaveLength(1);
    const docs = await asAdmin(request(app).get('/api/admin/media?kind=document'), session);
    expect(docs.body.data[0].mimeType).toBe('application/pdf');
    expect((await asAdmin(request(app).get('/api/admin/media?kind=exe'), session)).status).toBe(400);
  });

  it('modifie le texte alternatif et la visibilité', async () => {
    const { app } = createTestApp();
    const session = await openAdminSession(app);
    const media = await upload(app, session);

    const res = await asAdmin(request(app).patch(`/api/admin/media/${media.id}`), session)
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ altText: 'Nouvelle description', visibility: 'private' }));
    expect(res.status).toBe(200);
    expect(res.body.data.altText).toBe('Nouvelle description');
    expect(res.body.data.visibility).toBe('private');

    const invalid = await asAdmin(request(app).patch(`/api/admin/media/${media.id}`), session)
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({}));
    expect(invalid.status).toBe(400);
    const unknownField = await asAdmin(request(app).patch(`/api/admin/media/${media.id}`), session)
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ storageKey: 'autre' }));
    expect(unknownField.status).toBe(400);
  });

  it('refuse un identifiant suspect ou inexistant', async () => {
    const { app } = createTestApp();
    const session = await openAdminSession(app);
    expect((await asAdmin(request(app).delete('/api/admin/media/abc'), session)).status).toBe(400);
    expect((await asAdmin(request(app).delete('/api/admin/media/0'), session)).status).toBe(400);
    expect((await asAdmin(request(app).delete('/api/admin/media/1%20OR%201=1'), session)).status).toBe(400);
    expect((await asAdmin(request(app).delete('/api/admin/media/999'), session)).status).toBe(404);
  });

  it('remplace le contenu en gardant l’identifiant, et change l’adresse du fichier', async () => {
    const { app, storageDir } = createTestApp();
    const session = await openAdminSession(app);
    const media = await upload(app, session);

    const res = await asAdmin(request(app).put(`/api/admin/media/${media.id}/file`), session).attach('file', jpegBuffer(), 'neuve.jpg');
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(media.id);
    expect(res.body.data.mimeType).toBe('image/jpeg');
    expect(res.body.data.url).not.toBe(media.url);
    expect(storedFiles(storageDir)).toHaveLength(1); // l'ancien fichier a été supprimé

    // L'ancienne adresse ne répond plus, la nouvelle oui.
    expect((await request(app).get(media.url)).status).toBe(404);
    expect((await request(app).get(res.body.data.url)).status).toBe(200);
  });

  it('refuse de remplacer une image par un PDF, et conserve l’ancien fichier si la base échoue', async () => {
    const { app, storageDir, fakeFiles } = createTestApp();
    const session = await openAdminSession(app);
    const media = await upload(app, session);

    const wrongKind = await asAdmin(request(app).put(`/api/admin/media/${media.id}/file`), session).attach('file', pdfBuffer(), 'x.pdf');
    expect(wrongKind.status).toBe(400);

    fakeFiles.failures.replaceFile = true;
    const failed = await asAdmin(request(app).put(`/api/admin/media/${media.id}/file`), session).attach('file', jpegBuffer(), 'x.jpg');
    expect(failed.status).toBe(500);
    expect(storedFiles(storageDir)).toHaveLength(1);
    expect((await request(app).get(media.url)).status).toBe(200); // l'ancien fichier est toujours servi
  });

  it('supprime un fichier inutilisé, du stockage comme de la base', async () => {
    const { app, storageDir } = createTestApp();
    const session = await openAdminSession(app);
    const media = await upload(app, session);

    const res = await asAdmin(request(app).delete(`/api/admin/media/${media.id}`), session);
    expect(res.status).toBe(200);
    expect(storedFiles(storageDir)).toHaveLength(0);
    expect((await request(app).get(media.url)).status).toBe(404);
  });

  it('refuse de supprimer un fichier encore utilisé et dit où il l’est', async () => {
    const { app, storageDir, fakeFiles } = createTestApp();
    const session = await openAdminSession(app);
    const media = await upload(app, session);
    fakeFiles.usages.set(media.id, [{ where: 'Projet (image principale)', label: 'api-gestion-stock' }]);

    const res = await asAdmin(request(app).delete(`/api/admin/media/${media.id}`), session);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('MEDIA_IN_USE');
    expect(res.body.error.details.usages[0]).toEqual({ where: 'Projet (image principale)', label: 'api-gestion-stock' });
    expect(storedFiles(storageDir)).toHaveLength(1);
  });

  it('permet à l’administrateur d’afficher un fichier privé, avec des en-têtes stricts', async () => {
    const { app } = createTestApp();
    const session = await openAdminSession(app);
    const created = await asAdmin(request(app).post('/api/admin/media'), session).attach('file', pdfBuffer(), 'diplome.pdf');

    const anonymous = await request(app).get(created.body.data.url);
    expect(anonymous.status).toBe(401);

    const res = await asAdmin(request(app).get(created.body.data.url), session);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['cache-control']).toBe('private, no-cache');
  });
});
