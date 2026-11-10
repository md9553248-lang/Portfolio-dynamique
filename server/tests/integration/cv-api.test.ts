import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { CV_MAX_BYTES, createTestApp } from '../helpers/fakes.js';
import { htmlBuffer, pdfBuffer, pdfWithJavaScript, pngBuffer } from '../helpers/files.js';
import { asAdmin, openAdminSession } from '../helpers/session.js';
import { listFiles } from '../helpers/temp.js';

async function setup() {
  const test = createTestApp();
  const session = await openAdminSession(test.app);
  const upload = (content: Buffer, name = 'cv.pdf') =>
    asAdmin(request(test.app).post('/api/admin/cv'), session).attach('file', content, { filename: name, contentType: 'application/pdf' });
  const overview = async () => (await asAdmin(request(test.app).get('/api/admin/cv'), session)).body.data;
  const post = (path: string) => asAdmin(request(test.app).post(path), session);
  return { ...test, session, upload, overview, post };
}

describe('Gestion du CV : accès', () => {
  it('refuse un anonyme et exige le jeton CSRF pour toute modification', async () => {
    const { app, session } = await setup();
    expect((await request(app).get('/api/admin/cv')).status).toBe(401);
    expect((await request(app).post('/api/admin/cv').attach('file', pdfBuffer(), 'cv.pdf')).status).toBe(401);
    expect((await request(app).post('/api/admin/cv/1/publish')).status).toBe(401);

    const noCsrf = await request(app).post('/api/admin/cv/unpublish').set('Cookie', session.cookie);
    expect(noCsrf.status).toBe(403);
    expect((await request(app).delete('/api/admin/cv/1').set('Cookie', session.cookie)).status).toBe(403);
  });

  it('indique la taille maximale à l’interface', async () => {
    const { overview } = await setup();
    const data = await overview();
    expect(data.current).toBeNull();
    expect(data.draft).toBeNull();
    expect(data.archived).toEqual([]);
    expect(data.maxSizeMb).toBeGreaterThan(0);
  });
});

describe('Gestion du CV : import', () => {
  it('importe un PDF comme brouillon, sans toucher au CV publié', async () => {
    const { upload, post, overview } = await setup();

    const first = await upload(pdfBuffer('% A'));
    expect(first.status).toBe(201);
    expect(first.body.data.status).toBe('draft');
    expect(first.body.data.originalName).toBe('cv.pdf');
    expect(first.body.data.fileUrl).toBe(`/api/admin/cv/${first.body.data.id}/file`);
    await post(`/api/admin/cv/${first.body.data.id}/publish`);

    const second = await upload(pdfBuffer('% B'), 'nouveau.pdf');
    expect(second.status).toBe(201);
    const data = await overview();
    expect(data.current.id).toBe(first.body.data.id); // le CV publié n'a pas changé
    expect(data.draft.id).toBe(second.body.data.id);
  });

  it('remplace le brouillon précédent (un seul brouillon) et supprime son fichier', async () => {
    const { upload, overview, storageDir } = await setup();
    await upload(pdfBuffer('% A'));
    await upload(pdfBuffer('% B'));
    const data = await overview();
    expect(data.draft.originalName).toBe('cv.pdf');
    expect(listFiles(storageDir)).toHaveLength(1);
  });

  it('refuse tout ce qui n’est pas un vrai PDF, quel que soit le nom ou le type annoncé', async () => {
    const { upload, overview, storageDir } = await setup();
    for (const [content, name] of [
      [pngBuffer(), 'cv.pdf'],
      [htmlBuffer(), 'cv.pdf'],
      [Buffer.from('texte quelconque'), 'cv.pdf'],
      [Buffer.from('%PDF-1.4 tronqué sans fin'), 'cv.pdf'],
    ] as const) {
      const res = await upload(content, name);
      expect(res.status, String(content.subarray(0, 8))).toBe(400);
      expect(res.body.error.code).toBe('INVALID_FILE_TYPE');
    }
    expect((await overview()).draft).toBeNull();
    expect(listFiles(storageDir)).toHaveLength(0);
  });

  it('accepte un vrai PDF même avec une extension trompeuse', async () => {
    const { upload } = await setup();
    expect((await upload(pdfBuffer(), 'cv.txt')).status).toBe(201);
  });

  it('refuse un PDF qui contient du JavaScript', async () => {
    const { upload } = await setup();
    const res = await upload(pdfWithJavaScript());
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('UNSAFE_PDF');
  });

  it('refuse un PDF trop volumineux et un fichier vide', async () => {
    const { upload, overview } = await setup();
    const tooLarge = await upload(pdfBuffer(' '.repeat(CV_MAX_BYTES)));
    expect(tooLarge.status).toBe(413);
    expect(tooLarge.body.error.code).toBe('FILE_TOO_LARGE');
    expect((await upload(Buffer.alloc(0))).status).toBe(400);
    expect((await overview()).draft).toBeNull();
  });

  it('ne perd JAMAIS le CV publié quand l’import échoue (type, taille ou panne)', async () => {
    const { upload, post, overview, fakeFiles, storageDir } = await setup();
    const first = await upload(pdfBuffer('% officiel'));
    await post(`/api/admin/cv/${first.body.data.id}/publish`);
    const filesBefore = listFiles(storageDir);

    await upload(htmlBuffer());
    await upload(pdfBuffer(' '.repeat(CV_MAX_BYTES)));
    fakeFiles.failures.createDraft = true;
    const failure = await upload(pdfBuffer('% panne'));
    expect(failure.status).toBe(500);
    expect(JSON.stringify(failure.body)).not.toContain('Panne simulée');

    const data = await overview();
    expect(data.current.id).toBe(first.body.data.id);
    expect(data.current.status).toBe('published');
    expect(listFiles(storageDir)).toEqual(filesBefore); // le fichier de l'import raté a été retiré
  });

  it('refuse un envoi sans fichier', async () => {
    const { app, session } = await setup();
    const res = await asAdmin(request(app).post('/api/admin/cv'), session).field('note', 'rien');
    expect(res.status).toBe(400);
  });
});

describe('Gestion du CV : publication', () => {
  it('publie un brouillon, archive l’ancien CV et renseigne la date', async () => {
    const { upload, post, overview } = await setup();
    const a = await upload(pdfBuffer('% A'));
    await post(`/api/admin/cv/${a.body.data.id}/publish`);
    const b = await upload(pdfBuffer('% B'));
    const published = await post(`/api/admin/cv/${b.body.data.id}/publish`);

    expect(published.status).toBe(200);
    expect(published.body.data.status).toBe('published');
    expect(published.body.data.publishedAt).not.toBeNull();
    const data = await overview();
    expect(data.current.id).toBe(b.body.data.id);
    expect(data.archived.map((version: { id: number }) => version.id)).toEqual([a.body.data.id]);
    expect(data.draft).toBeNull();
  });

  it('n’autorise jamais deux CV publiés en même temps', async () => {
    const { upload, post, fakeFiles } = await setup();
    for (let index = 0; index < 3; index++) {
      const version = await upload(pdfBuffer(`% ${index}`));
      await post(`/api/admin/cv/${version.body.data.id}/publish`);
    }
    expect(fakeFiles.versions.filter((version) => version.status === 'published')).toHaveLength(1);
  });

  it('permet de republier une ancienne version', async () => {
    const { upload, post, overview } = await setup();
    const a = await upload(pdfBuffer('% A'));
    await post(`/api/admin/cv/${a.body.data.id}/publish`);
    const b = await upload(pdfBuffer('% B'));
    await post(`/api/admin/cv/${b.body.data.id}/publish`);

    expect((await post(`/api/admin/cv/${a.body.data.id}/publish`)).status).toBe(200);
    expect((await overview()).current.id).toBe(a.body.data.id);
  });

  it('masque le CV, puis refuse de le masquer s’il n’y en a plus', async () => {
    const { upload, post, overview } = await setup();
    const version = await upload(pdfBuffer());
    await post(`/api/admin/cv/${version.body.data.id}/publish`);

    expect((await post('/api/admin/cv/unpublish')).status).toBe(200);
    expect((await overview()).current).toBeNull();
    const again = await post('/api/admin/cv/unpublish');
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('NO_PUBLISHED_CV');
  });

  it('renvoie 404 pour une version inexistante et 400 pour un identifiant invalide', async () => {
    const { post } = await setup();
    expect((await post('/api/admin/cv/999/publish')).status).toBe(404);
    expect((await post('/api/admin/cv/abc/publish')).status).toBe(400);
  });
});

describe('Gestion du CV : aperçu et suppression', () => {
  it('permet à l’administrateur de prévisualiser et de télécharger n’importe quelle version', async () => {
    const { app, session, upload } = await setup();
    const draft = await upload(pdfBuffer('% brouillon'));

    const preview = await asAdmin(request(app).get(`/api/admin/cv/${draft.body.data.id}/file`), session);
    expect(preview.status).toBe(200);
    expect(preview.headers['content-type']).toContain('application/pdf');
    expect(preview.headers['content-disposition']).toContain('inline');
    expect(preview.headers['x-content-type-options']).toBe('nosniff');
    expect(preview.headers['cache-control']).toBe('private, no-cache');

    const download = await asAdmin(request(app).get(`/api/admin/cv/${draft.body.data.id}/file?download=1`), session);
    expect(download.headers['content-disposition']).toContain('attachment');
    expect((await asAdmin(request(app).get(`/api/admin/cv/${draft.body.data.id}/file?download=oui`), session)).status).toBe(400);
  });

  it('annule un brouillon avant publication : il disparaît, le CV publié reste', async () => {
    const { upload, post, overview, app, session, storageDir } = await setup();
    const a = await upload(pdfBuffer('% A'));
    await post(`/api/admin/cv/${a.body.data.id}/publish`);
    const draft = await upload(pdfBuffer('% B'));

    const res = await asAdmin(request(app).delete(`/api/admin/cv/${draft.body.data.id}`), session);
    expect(res.status).toBe(200);
    const data = await overview();
    expect(data.draft).toBeNull();
    expect(data.current.id).toBe(a.body.data.id);
    expect(listFiles(storageDir)).toHaveLength(1);
  });

  it('refuse de supprimer le CV publié', async () => {
    const { upload, post, app, session } = await setup();
    const version = await upload(pdfBuffer());
    await post(`/api/admin/cv/${version.body.data.id}/publish`);
    const res = await asAdmin(request(app).delete(`/api/admin/cv/${version.body.data.id}`), session);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CV_PUBLISHED');
  });

  it('supprime une ancienne version archivée', async () => {
    const { upload, post, app, session, overview } = await setup();
    const a = await upload(pdfBuffer('% A'));
    await post(`/api/admin/cv/${a.body.data.id}/publish`);
    await post('/api/admin/cv/unpublish');
    expect((await asAdmin(request(app).delete(`/api/admin/cv/${a.body.data.id}`), session)).status).toBe(200);
    expect((await overview()).archived).toEqual([]);
  });

  it('inscrit chaque action dans le journal d’audit', async () => {
    const { upload, post, fakeFiles } = await setup();
    const version = await upload(pdfBuffer());
    await post(`/api/admin/cv/${version.body.data.id}/publish`);
    await post('/api/admin/cv/unpublish');
    expect(fakeFiles.audit.map((entry) => entry.action)).toEqual(['cv.upload', 'cv.publish', 'cv.unpublish']);
  });
});

describe('Tableau de bord', () => {
  it('exige une session et renvoie des statistiques et l’activité récente', async () => {
    const { app, session } = await setup();
    expect((await request(app).get('/api/admin/dashboard')).status).toBe(401);

    const res = await asAdmin(request(app).get('/api/admin/dashboard'), session);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      projects: { published: 3, draft: 1 },
      messages: { total: 5, unread: 2 },
      security: { failedLogins24h: 4 },
    });
    expect(res.body.data.recentActivity[0].action).toBe('cv.publish');
    expect(res.headers['cache-control']).toBe('no-store');
  });
});
