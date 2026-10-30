import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import type { Connection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadMigrationFiles, runMigrations } from '../../src/db/migrator.js';

/*
 * Tests d'intégration contre une VRAIE base MySQL de test.
 * Ils sont ignorés tant que DB_TEST_NAME n'est pas défini dans server/.env.
 * SÉCURITÉ : la base de test est entièrement vidée au début. Son nom doit donc se terminer par
 * "_test" : sinon les tests refusent de s'exécuter (on ne risque jamais d'effacer la vraie base).
 */

const MIGRATIONS_DIR = fileURLToPath(new URL('../../db/migrations', import.meta.url));
const env = process.env;
const testDbName = env['DB_TEST_NAME'] ?? '';

const enabled =
  testDbName.endsWith('_test') &&
  Boolean(env['DB_HOST'] && env['DB_USER'] && env['DB_PASSWORD']) &&
  Boolean(env['DB_MIGRATION_USER'] && env['DB_MIGRATION_PASSWORD']);

const EXPECTED_TABLES = [
  'article_categories',
  'article_translations',
  'articles',
  'audit_logs',
  'certifications',
  'cv_versions',
  'education_translations',
  'educations',
  'experience_technologies',
  'experience_translations',
  'experiences',
  'login_attempts',
  'media',
  'message_replies',
  'messages',
  'profile',
  'profile_translations',
  'project_images',
  'project_technologies',
  'project_translations',
  'projects',
  'schema_migrations',
  'sessions',
  'site_settings',
  'skill_categories',
  'skills',
  'social_links',
  'technologies',
  'users',
];

function connectionOptions(user: string, password: string) {
  return {
    host: env['DB_HOST'],
    port: Number(env['DB_PORT'] ?? 3306),
    user,
    password,
    database: testDbName,
    charset: 'utf8mb4',
    timezone: 'Z',
  };
}

async function resetDatabase(connection: Connection): Promise<void> {
  await connection.query('SET FOREIGN_KEY_CHECKS = 0');
  const [rows] = await connection.query<RowDataPacket[]>(
    'SELECT table_name AS name FROM information_schema.tables WHERE table_schema = DATABASE()',
  );
  for (const row of rows) {
    await connection.query(`DROP TABLE IF EXISTS \`${String(row['name'])}\``);
  }
  await connection.query('SET FOREIGN_KEY_CHECKS = 1');
}

describe.skipIf(!enabled)('Base de données MySQL (intégration)', () => {
  let admin: Connection;

  async function insertUser(email: string): Promise<number> {
    const [result] = await admin.execute<ResultSetHeader>(
      'INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)',
      [email, 'empreinte-de-test', 'Test'],
    );
    return result.insertId;
  }

  async function insertMedia(mime = 'application/pdf'): Promise<number> {
    const [result] = await admin.execute<ResultSetHeader>(
      'INSERT INTO media (storage_key, original_name, mime_type, size_bytes, sha256) VALUES (?, ?, ?, ?, ?)',
      [randomUUID(), 'cv.pdf', mime, 1234, 'a'.repeat(64)],
    );
    return result.insertId;
  }

  beforeAll(async () => {
    admin = await mysql.createConnection({
      ...connectionOptions(env['DB_MIGRATION_USER'] ?? '', env['DB_MIGRATION_PASSWORD'] ?? ''),
      multipleStatements: true,
    });
    await resetDatabase(admin);
    const files = await loadMigrationFiles(MIGRATIONS_DIR);
    await runMigrations(admin, files);
  });

  afterAll(async () => {
    await admin?.end();
  });

  it('crée toutes les tables attendues', async () => {
    const [rows] = await admin.query<RowDataPacket[]>(
      'SELECT table_name AS name FROM information_schema.tables WHERE table_schema = DATABASE() ORDER BY table_name',
    );
    expect(rows.map((row) => String(row['name']))).toEqual(EXPECTED_TABLES);
  });

  it('ne réapplique rien lors d’une seconde exécution', async () => {
    const files = await loadMigrationFiles(MIGRATIONS_DIR);
    expect(await runMigrations(admin, files)).toHaveLength(0);
  });

  it('insère les réglages par défaut', async () => {
    const [rows] = await admin.query<RowDataPacket[]>(
      "SELECT setting_value FROM site_settings WHERE setting_key = 'site.default_theme'",
    );
    expect(rows[0]?.['setting_value']).toBe('dark');
  });

  it('refuse deux comptes avec le même e-mail, sans tenir compte des majuscules', async () => {
    await insertUser('Admin@Exemple.com');
    await expect(insertUser('admin@exemple.com')).rejects.toMatchObject({ code: 'ER_DUP_ENTRY' });
  });

  it('refuse une session liée à un utilisateur inexistant', async () => {
    await expect(
      admin.execute('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)', [
        'b'.repeat(64),
        999_999,
        '2035-01-01 00:00:00',
      ]),
    ).rejects.toMatchObject({ code: 'ER_NO_REFERENCED_ROW_2' });
  });

  it('supprime les traductions d’un projet supprimé (cascade)', async () => {
    const [project] = await admin.execute<ResultSetHeader>(
      "INSERT INTO projects (slug, category, project_date) VALUES ('cascade-test', 'Back-end', '2026-01-01')",
    );
    await admin.execute(
      "INSERT INTO project_translations (project_id, locale, title, short_description, description) VALUES (?, 'fr', 'T', 'C', 'D')",
      [project.insertId],
    );
    await admin.execute('DELETE FROM projects WHERE id = ?', [project.insertId]);
    const [rows] = await admin.execute<RowDataPacket[]>(
      'SELECT COUNT(*) AS total FROM project_translations WHERE project_id = ?',
      [project.insertId],
    );
    expect(Number(rows[0]?.['total'])).toBe(0);
  });

  it('refuse un projet publié sans date de publication', async () => {
    await expect(
      admin.execute(
        "INSERT INTO projects (slug, category, project_date, status) VALUES ('sans-date', 'Back-end', '2026-01-01', 'published')",
      ),
    ).rejects.toMatchObject({ code: 'ER_CHECK_CONSTRAINT_VIOLATED' });
  });

  it('refuse les adresses qui ne sont pas en https (ex. javascript:)', async () => {
    await expect(
      admin.execute(
        "INSERT INTO projects (slug, category, project_date, github_url) VALUES ('url-dangereuse', 'Back-end', '2026-01-01', 'javascript:alert(1)')",
      ),
    ).rejects.toMatchObject({ code: 'ER_CHECK_CONSTRAINT_VIOLATED' });
    await expect(
      admin.execute(
        "INSERT INTO social_links (platform, url) VALUES ('Site', 'http://non-chiffre.example')",
      ),
    ).rejects.toMatchObject({ code: 'ER_CHECK_CONSTRAINT_VIOLATED' });
  });

  it('refuse un second profil et un type de fichier non autorisé', async () => {
    await expect(
      admin.execute("INSERT INTO profile (id, display_name) VALUES (2, 'Autre')"),
    ).rejects.toMatchObject({ code: 'ER_CHECK_CONSTRAINT_VIOLATED' });
    await expect(insertMedia('image/svg+xml')).rejects.toMatchObject({
      code: 'ER_CHECK_CONSTRAINT_VIOLATED',
    });
  });

  it('garantit qu’un seul CV peut être publié à la fois', async () => {
    const first = await insertMedia();
    const second = await insertMedia();
    await admin.execute(
      "INSERT INTO cv_versions (media_id, status, published_at) VALUES (?, 'published', NOW())",
      [first],
    );
    await expect(
      admin.execute(
        "INSERT INTO cv_versions (media_id, status, published_at) VALUES (?, 'published', NOW())",
        [second],
      ),
    ).rejects.toMatchObject({ code: 'ER_DUP_ENTRY' });

    // Plusieurs CV archivés ou en brouillon restent autorisés.
    await admin.execute("INSERT INTO cv_versions (media_id, status) VALUES (?, 'draft')", [second]);
    await admin.execute("INSERT INTO cv_versions (media_id, status) VALUES (?, 'archived')", [
      second,
    ]);
  });

  it('empêche de supprimer un fichier encore utilisé par une version de CV', async () => {
    const media = await insertMedia();
    await admin.execute("INSERT INTO cv_versions (media_id, status) VALUES (?, 'draft')", [media]);
    await expect(admin.execute('DELETE FROM media WHERE id = ?', [media])).rejects.toMatchObject({
      code: 'ER_ROW_IS_REFERENCED_2',
    });
  });

  it('stocke un texte malveillant comme du simple texte (requêtes paramétrées)', async () => {
    const hostile = "Robert'); DROP TABLE users;--";
    await admin.execute('INSERT INTO messages (name, email, subject, body) VALUES (?, ?, ?, ?)', [
      hostile,
      'x@exemple.com',
      'Sujet',
      'Message',
    ]);
    const [messages] = await admin.execute<RowDataPacket[]>(
      'SELECT name FROM messages WHERE name = ?',
      [hostile],
    );
    expect(messages[0]?.['name']).toBe(hostile);
    const [users] = await admin.query<RowDataPacket[]>('SELECT COUNT(*) AS total FROM users');
    expect(Number(users[0]?.['total'])).toBeGreaterThan(0);
  });

  it('conserve les accents et les émojis (utf8mb4)', async () => {
    const text = 'Éléphant à Dakar 🙂';
    const [result] = await admin.execute<ResultSetHeader>(
      'INSERT INTO messages (name, email, subject, body) VALUES (?, ?, ?, ?)',
      ['Test', 'utf8@exemple.com', 'Sujet', text],
    );
    const [rows] = await admin.execute<RowDataPacket[]>('SELECT body FROM messages WHERE id = ?', [
      result.insertId,
    ]);
    expect(rows[0]?.['body']).toBe(text);
  });

  it('limite le compte de l’application aux données (lecture/écriture, pas de structure)', async () => {
    const app = await mysql.createConnection(
      connectionOptions(env['DB_USER'] ?? '', env['DB_PASSWORD'] ?? ''),
    );
    try {
      const [rows] = await app.query<RowDataPacket[]>('SELECT COUNT(*) AS total FROM users');
      expect(Number(rows[0]?.['total'])).toBeGreaterThan(0);

      for (const statement of [
        'CREATE TABLE intrus (id INT)',
        'DROP TABLE users',
        'ALTER TABLE users ADD COLUMN x INT',
      ]) {
        const error = await app.query(statement).then(
          () => null,
          (caught: unknown) => caught as { errno?: number },
        );
        expect(error, statement).not.toBeNull();
        expect([1044, 1142]).toContain(error?.errno);
      }
    } finally {
      await app.end();
    }
  });
});
