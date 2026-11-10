import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import type { Connection, Pool, RowDataPacket } from 'mysql2/promise';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadMigrationFiles, runMigrations } from '../../src/db/migrator.js';
import { createMysqlAuditRepository } from '../../src/modules/audit/audit.mysql.js';
import { createMysqlCvRepository } from '../../src/modules/cv/cv.mysql.js';
import type { CvRepository } from '../../src/modules/cv/cv.repository.js';
import { createMysqlDashboardRepository } from '../../src/modules/dashboard/dashboard.mysql.js';
import { createMysqlMediaRepository } from '../../src/modules/media/media.mysql.js';
import type { MediaRepository, NewMedia } from '../../src/modules/media/media.repository.js';
import { seedDemoData } from '../../src/seed/seed-demo.js';
import { appOptions, dbTestEnabled, migratorOptions, resetDatabase } from '../helpers/db.js';

const MIGRATIONS_DIR = fileURLToPath(new URL('../../db/migrations', import.meta.url));

function newMedia(overrides: Partial<NewMedia> = {}): NewMedia {
  return {
    storageKey: randomUUID(),
    originalName: 'fichier.png',
    mimeType: 'image/png',
    sizeBytes: 1234,
    sha256: 'a'.repeat(64),
    visibility: 'public',
    altText: null,
    uploadedBy: null,
    ...overrides,
  };
}

const cvFile = (name = 'cv.pdf') => ({ storageKey: randomUUID(), originalName: name, sizeBytes: 2048, sha256: 'b'.repeat(64) });

/*
 * Vérifie les VRAIES requêtes SQL des médias, du CV et du tableau de bord, avec le compte de l'application.
 * Ignoré tant que DB_TEST_NAME (se terminant par _test) n'est pas défini dans server/.env.
 */
describe.skipIf(!dbTestEnabled)('Médias, CV et tableau de bord sur MySQL (intégration)', () => {
  let admin: Connection;
  let pool: Pool;
  let media: MediaRepository;
  let cv: CvRepository;

  const count = async (sql: string, params: Array<string | number> = []) => {
    const [rows] = await admin.execute<RowDataPacket[]>(sql, params);
    return Number(rows[0]?.['total']);
  };

  beforeAll(async () => {
    admin = await mysql.createConnection(migratorOptions());
    await resetDatabase(admin);
    await runMigrations(admin, await loadMigrationFiles(MIGRATIONS_DIR));
    await seedDemoData(admin);
    pool = mysql.createPool(appOptions());
    media = createMysqlMediaRepository(pool);
    cv = createMysqlCvRepository(pool);
  });

  afterAll(async () => {
    await pool?.end();
    await admin?.end();
  });

  describe('médiathèque', () => {
    it('enregistre, retrouve et liste les fichiers (les plus récents d’abord, par genre)', async () => {
      const image = await media.insert(newMedia({ altText: 'Logo' }));
      const pdf = await media.insert(newMedia({ mimeType: 'application/pdf', visibility: 'private', originalName: 'd.pdf' }));

      const found = await media.findById(image);
      expect(found).toMatchObject({ mimeType: 'image/png', altText: 'Logo', visibility: 'public' });
      expect(found?.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);

      const all = await media.list('all');
      const ids = all.map((item) => item.id);
      expect(ids).toEqual([...ids].sort((a, b) => b - a));
      expect((await media.list('image')).every((item) => item.mimeType.startsWith('image/'))).toBe(true);
      expect((await media.list('document')).map((item) => item.id)).toContain(pdf);
    });

    it('ne sert en public que les fichiers publics', async () => {
      const publicKey = randomUUID();
      const privateKey = randomUUID();
      await media.insert(newMedia({ storageKey: publicKey }));
      await media.insert(newMedia({ storageKey: privateKey, visibility: 'private' }));
      expect(await media.findPublicByKey(publicKey)).not.toBeNull();
      expect(await media.findPublicByKey(privateKey)).toBeNull();
      expect(await media.findPublicByKey("x' OR '1'='1")).toBeNull();
    });

    it('met à jour la description et la visibilité, et remplace le fichier en gardant l’identifiant', async () => {
      const id = await media.insert(newMedia());
      expect(await media.update(id, { altText: 'Nouveau', visibility: 'private' })).toBe(true);
      expect(await media.findById(id)).toMatchObject({ altText: 'Nouveau', visibility: 'private' });

      const key = randomUUID();
      expect(
        await media.replaceFile(id, { storageKey: key, originalName: 'neuf.jpg', mimeType: 'image/jpeg', sizeBytes: 9, sha256: 'c'.repeat(64) }),
      ).toBe(true);
      expect(await media.findById(id)).toMatchObject({ storageKey: key, mimeType: 'image/jpeg', originalName: 'neuf.jpg' });
      expect(await media.update(999_999, { altText: null, visibility: 'public' })).toBe(false);
    });

    it('trouve où un fichier est utilisé (projet, galerie, profil, article, certification)', async () => {
      const id = await media.insert(newMedia());
      expect(await media.findUsages(id)).toEqual([]);

      await admin.execute('UPDATE projects SET cover_media_id = ? WHERE slug = ?', [id, 'api-gestion-stock']);
      await admin.execute(
        'INSERT INTO project_images (project_id, media_id) SELECT id, ? FROM projects WHERE slug = ?',
        [id, 'tableau-de-bord-statistiques'],
      );
      await admin.execute('UPDATE profile SET photo_media_id = ? WHERE id = 1', [id]);
      await admin.execute('UPDATE articles SET cover_media_id = ? WHERE slug = ?', [id, 'organiser-un-projet-react']);
      await admin.execute('UPDATE certifications SET media_id = ? LIMIT 1', [id]);

      const usages = await media.findUsages(id);
      expect(usages.map((usage) => usage.where).sort()).toEqual(
        ['Article (image)', 'Certification', 'Photo du profil', 'Projet (galerie)', 'Projet (image principale)'].sort(),
      );
      expect(usages.find((usage) => usage.where === 'Projet (image principale)')?.label).toBe('api-gestion-stock');
    });

    it('supprime un fichier', async () => {
      const id = await media.insert(newMedia());
      await media.delete(id);
      expect(await media.findById(id)).toBeNull();
    });
  });

  describe('CV', () => {
    it('crée un brouillon, en remplace un autre dans la même transaction et renvoie les fichiers à supprimer', async () => {
      const first = cvFile('a.pdf');
      const a = await cv.createDraft({ file: first, uploadedBy: null });
      expect(a.replacedKeys).toEqual([]);

      const second = cvFile('b.pdf');
      const b = await cv.createDraft({ file: second, uploadedBy: null });
      expect(b.replacedKeys).toEqual([first.storageKey]);

      const versions = await cv.list();
      expect(versions.filter((version) => version.status === 'draft').map((version) => version.originalName)).toEqual(['b.pdf']);
      expect(await count('SELECT COUNT(*) AS total FROM media WHERE storage_key = ?', [first.storageKey])).toBe(0);
    });

    it('n’affecte pas l’ancien brouillon si le nouvel import échoue (transaction annulée)', async () => {
      const current = (await cv.list()).find((version) => version.status === 'draft');
      expect(current).toBeDefined();
      // Une clé de stockage déjà utilisée par un AUTRE fichier viole l'unicité : l'insertion échoue après la
      // suppression de l'ancien brouillon, et la transaction doit tout annuler (l'ancien brouillon est conservé).
      const otherKey = (await media.list('all'))[0]?.storageKey ?? '';
      await expect(
        cv.createDraft({ file: { ...cvFile(), storageKey: otherKey }, uploadedBy: null }),
      ).rejects.toMatchObject({ code: 'ER_DUP_ENTRY' });
      expect((await cv.findById(current?.id ?? 0))?.status).toBe('draft');
    });

    it('publie une version, archive la précédente et garantit un seul CV publié', async () => {
      const draft = (await cv.list()).find((version) => version.status === 'draft');
      expect(await cv.publish(draft?.id ?? 0)).toBe('published');
      const published = await cv.findPublished();
      expect(published?.id).toBe(draft?.id);
      expect(published?.publishedAt).toMatch(/Z$/);

      const next = await cv.createDraft({ file: cvFile('c.pdf'), uploadedBy: null });
      expect(await cv.publish(next.versionId)).toBe('published');
      expect((await cv.findPublished())?.id).toBe(next.versionId);
      expect((await cv.findById(draft?.id ?? 0))?.status).toBe('archived');
      expect(await count("SELECT COUNT(*) AS total FROM cv_versions WHERE status = 'published'")).toBe(1);
    });

    it('republier la version déjà publiée est sans effet, une version inconnue est signalée', async () => {
      const published = await cv.findPublished();
      expect(await cv.publish(published?.id ?? 0)).toBe('published');
      expect(await cv.publish(999_999)).toBe('not_found');
      expect(await count("SELECT COUNT(*) AS total FROM cv_versions WHERE status = 'published'")).toBe(1);
    });

    it('republie une ancienne version', async () => {
      const archived = (await cv.list()).find((version) => version.status === 'archived');
      expect(await cv.publish(archived?.id ?? 0)).toBe('published');
      expect((await cv.findPublished())?.id).toBe(archived?.id);
    });

    it('masque le CV puis signale qu’il n’y a plus rien à masquer', async () => {
      expect(await cv.unpublish()).toBe(true);
      expect(await cv.findPublished()).toBeNull();
      expect(await cv.unpublish()).toBe(false);
    });

    it('supprime un brouillon ou une version archivée, jamais la version publiée', async () => {
      const draft = await cv.createDraft({ file: cvFile('d.pdf'), uploadedBy: null });
      const deleted = await cv.deleteVersion(draft.versionId);
      expect(deleted.result).toBe('deleted');
      expect(await cv.findById(draft.versionId)).toBeNull();

      const toPublish = (await cv.list())[0];
      await cv.publish(toPublish?.id ?? 0);
      expect(await cv.deleteVersion(toPublish?.id ?? 0)).toEqual({ result: 'is_published' });
      expect(await cv.deleteVersion(999_999)).toEqual({ result: 'not_found' });
    });

    it('exclut les fichiers de CV de la médiathèque et de l’accès public', async () => {
      const versions = await cv.list();
      const keys = versions.map((version) => version.storageKey);
      expect(keys.length).toBeGreaterThan(0);
      const library = await media.list('all');
      for (const key of keys) {
        expect(library.some((item) => item.storageKey === key)).toBe(false);
        expect(await media.findPublicByKey(key)).toBeNull();
      }
    });

    it('empêche de supprimer directement le fichier d’une version de CV (clé étrangère)', async () => {
      const version = (await cv.list())[0];
      await expect(admin.execute('DELETE FROM media WHERE id = ?', [version?.mediaId ?? 0])).rejects.toMatchObject({
        code: 'ER_ROW_IS_REFERENCED_2',
      });
    });
  });

  describe('tableau de bord et journal', () => {
    it('calcule les statistiques à partir des vraies données', async () => {
      await admin.execute(
        "INSERT INTO messages (name, email, subject, body, status) VALUES ('A', 'a@exemple.com', 'S', 'Un message assez long', 'unread'), ('B', 'b@exemple.com', 'S', 'Un autre message long', 'read')",
      );
      const audit = createMysqlAuditRepository(pool);
      await audit.log({ userId: null, action: 'auth.login_failed' });
      await audit.log({ userId: null, action: 'auth.login_failed' });
      await audit.log({ userId: null, action: 'cv.publish', entityType: 'cv', entityId: 1, details: { raison: 'test' } });

      const stats = await createMysqlDashboardRepository(pool).getStats();
      expect(stats.projects).toEqual({ published: 4, draft: 1 });
      expect(stats.articles).toEqual({ published: 2, draft: 1 });
      expect(stats.messages).toEqual({ total: 2, unread: 1 });
      expect(stats.security.failedLogins24h).toBe(2);
      expect(stats.media.total).toBeGreaterThan(0);
    });

    it('liste l’activité récente sans le bruit des échecs de connexion', async () => {
      const activity = await createMysqlDashboardRepository(pool).getRecentActivity();
      expect(activity.length).toBeGreaterThan(0);
      expect(activity.some((item) => item.action.startsWith('auth.login_'))).toBe(false);
      expect(activity[0]).toMatchObject({ action: 'cv.publish', entityType: 'cv' });
      expect(activity[0]?.createdAt).toMatch(/Z$/);
    });

    it('enregistre le journal avec les informations demandées', async () => {
      const [rows] = await admin.execute<RowDataPacket[]>(
        "SELECT entity_type, entity_id, details FROM audit_logs WHERE action = 'cv.publish'",
      );
      expect(rows[0]).toMatchObject({ entity_type: 'cv', entity_id: 1 });
      expect(JSON.stringify(rows[0]?.['details'])).toContain('test');
    });
  });

  it('empêche le compte de l’application de modifier la structure', async () => {
    const error = await pool.query('ALTER TABLE media ADD COLUMN pirate INT').then(
      () => null,
      (caught: unknown) => caught as { errno?: number },
    );
    expect([1044, 1142]).toContain(error?.errno);
  });
});
