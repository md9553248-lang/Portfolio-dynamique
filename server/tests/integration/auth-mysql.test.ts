import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import type { Connection, Pool, RowDataPacket } from 'mysql2/promise';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadMigrationFiles, runMigrations } from '../../src/db/migrator.js';
import { createLogger } from '../../src/logging/logger.js';
import { createMysqlAuthRepository } from '../../src/modules/auth/auth.mysql.js';
import type { AuthRepository } from '../../src/modules/auth/auth.repository.js';
import {
  createAuthService,
  InvalidCredentialsError,
  TooManyAttemptsError,
} from '../../src/modules/auth/auth.service.js';
import { appOptions, dbTestEnabled, migratorOptions, resetDatabase } from '../helpers/db.js';
import { fakeHasher } from '../helpers/fake-auth.js';

const MIGRATIONS_DIR = fileURLToPath(new URL('../../db/migrations', import.meta.url));
const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);

/*
 * Vérifie les VRAIES requêtes SQL de l'authentification (expiration, fenêtre d'échecs, droits).
 * Ignoré tant que DB_TEST_NAME (se terminant par _test) n'est pas défini dans server/.env.
 */
describe.skipIf(!dbTestEnabled)('Authentification sur MySQL (intégration)', () => {
  let admin: Connection;
  let pool: Pool;
  let repo: AuthRepository;
  let userId: number;
  let sequence = 0;

  const newToken = () => `${String(++sequence).padStart(2, '0')}${'c'.repeat(62)}`;

  async function session(absoluteSeconds = 3600) {
    const tokenHash = newToken();
    await repo.createSession({ tokenHash, userId, ipHash: HASH_A, userAgent: 'test', absoluteSeconds });
    return tokenHash;
  }

  beforeAll(async () => {
    admin = await mysql.createConnection(migratorOptions());
    await resetDatabase(admin);
    await runMigrations(admin, await loadMigrationFiles(MIGRATIONS_DIR));

    pool = mysql.createPool(appOptions());
    repo = createMysqlAuthRepository(pool);
    userId = await repo.createUser({ email: 'Admin@Exemple.com', passwordHash: 'fake$secret', displayName: 'Admin' });
  });

  afterAll(async () => {
    await pool?.end();
    await admin?.end();
  });

  it('retrouve un compte sans tenir compte des majuscules et refuse un doublon', async () => {
    expect((await repo.findUserByEmail('admin@exemple.com'))?.id).toBe(userId);
    await expect(
      repo.createUser({ email: 'ADMIN@exemple.com', passwordHash: 'x', displayName: 'Autre' }),
    ).rejects.toMatchObject({ code: 'ER_DUP_ENTRY' });
  });

  it('gère le cycle d’une session : création, lecture, suppression', async () => {
    const tokenHash = await session();
    const found = await repo.findActiveSession(tokenHash, 300);
    expect(found?.user.email).toBe('Admin@Exemple.com');
    expect(found?.idleSeconds).toBeLessThan(5);

    await repo.deleteSession(tokenHash);
    expect(await repo.findActiveSession(tokenHash, 300)).toBeNull();
  });

  it('refuse une session dont la durée maximale est atteinte', async () => {
    const tokenHash = await session(0);
    expect(await repo.findActiveSession(tokenHash, 300)).toBeNull();
  });

  it('refuse une session inactive trop longtemps, et la réactive après touchSession', async () => {
    const tokenHash = await session();
    await admin.execute(
      'UPDATE sessions SET last_seen_at = DATE_SUB(UTC_TIMESTAMP(), INTERVAL 10 MINUTE) WHERE token_hash = ?',
      [tokenHash],
    );
    expect(await repo.findActiveSession(tokenHash, 300)).toBeNull();

    const tolerant = await repo.findActiveSession(tokenHash, 3600);
    expect(tolerant?.idleSeconds).toBeGreaterThanOrEqual(595);
    expect(tolerant?.idleSeconds).toBeLessThan(620);

    await repo.touchSession(tokenHash);
    expect((await repo.findActiveSession(tokenHash, 300))?.idleSeconds).toBeLessThan(5);
  });

  it('refuse la session d’un compte désactivé', async () => {
    const tokenHash = await session();
    await admin.execute('UPDATE users SET is_active = 0 WHERE id = ?', [userId]);
    expect(await repo.findActiveSession(tokenHash, 300)).toBeNull();
    await admin.execute('UPDATE users SET is_active = 1 WHERE id = ?', [userId]);
    expect(await repo.findActiveSession(tokenHash, 300)).not.toBeNull();
  });

  it('ferme les autres sessions d’un compte en gardant celle indiquée', async () => {
    const keep = await session();
    const drop = await session();
    await repo.deleteSessionsForUser(userId, keep);
    expect(await repo.findActiveSession(keep, 300)).not.toBeNull();
    expect(await repo.findActiveSession(drop, 300)).toBeNull();
  });

  it('supprime les sessions expirées ou inactives lors du nettoyage', async () => {
    const live = await session();
    const stale = await session();
    await admin.execute(
      'UPDATE sessions SET last_seen_at = DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 HOUR) WHERE token_hash = ?',
      [stale],
    );
    await repo.deleteExpiredSessions(3600);
    const [rows] = await admin.execute<RowDataPacket[]>(
      'SELECT token_hash FROM sessions WHERE token_hash IN (?, ?)',
      [live, stale],
    );
    expect(rows.map((row) => row['token_hash'])).toEqual([live]);
  });

  it('compte les échecs récents par couple e-mail + adresse et par e-mail', async () => {
    for (let i = 0; i < 3; i++) {
      await repo.recordLoginAttempt({ identifierHash: HASH_A, ipHash: HASH_A, succeeded: false });
    }
    await repo.recordLoginAttempt({ identifierHash: HASH_A, ipHash: HASH_B, succeeded: false });
    await repo.recordLoginAttempt({ identifierHash: HASH_A, ipHash: HASH_A, succeeded: true });

    const stats = await repo.getFailureStats({ identifierHash: HASH_A, ipHash: HASH_A });
    expect(stats.pair.count).toBe(3);
    expect(stats.identifier.count).toBe(4);
    expect(stats.pair.secondsSinceLast).toBeLessThan(5);

    const other = await repo.getFailureStats({ identifierHash: HASH_A, ipHash: HASH_B });
    expect(other.pair.count).toBe(1);

    await repo.clearFailedAttempts({ identifierHash: HASH_A, ipHash: HASH_A });
    expect((await repo.getFailureStats({ identifierHash: HASH_A, ipHash: HASH_A })).pair.count).toBe(0);
    expect((await repo.getFailureStats({ identifierHash: HASH_A, ipHash: HASH_A })).identifier.count).toBe(1);
  });

  it('ignore les échecs plus vieux que la fenêtre et purge les très anciens', async () => {
    const stale = 'd'.repeat(64);
    await admin.execute(
      `INSERT INTO login_attempts (identifier_hash, ip_hash, succeeded, attempted_at)
       VALUES (?, ?, 0, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 20 MINUTE)),
              (?, ?, 0, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 40 DAY))`,
      [stale, stale, stale, stale],
    );
    const stats = await repo.getFailureStats({ identifierHash: stale, ipHash: stale });
    expect(stats.pair.count).toBe(0);
    expect(stats.pair.secondsSinceLast).toBeGreaterThan(1_000_000);

    await repo.purgeOldLoginAttempts();
    const [rows] = await admin.execute<RowDataPacket[]>(
      'SELECT COUNT(*) AS total FROM login_attempts WHERE identifier_hash = ?',
      [stale],
    );
    expect(Number(rows[0]?.['total'])).toBe(1);
  });

  it('enregistre le journal d’audit', async () => {
    await repo.writeAudit({ userId, action: 'test.action', ipHash: HASH_A, details: { raison: 'test' } });
    const [rows] = await admin.execute<RowDataPacket[]>(
      "SELECT action, details FROM audit_logs WHERE action = 'test.action'",
    );
    expect(rows).toHaveLength(1);
    expect(JSON.stringify(rows[0]?.['details'])).toContain('test');
  });

  it('fait fonctionner tout le parcours de connexion sur MySQL', async () => {
    const service = createAuthService({
      repo,
      hasher: fakeHasher,
      ipHashSecret: 'secret-de-test',
      absoluteSessionSeconds: 3600,
      idleSessionSeconds: 300,
      logger: createLogger('silent'),
    });
    const context = { ip: '203.0.113.9', userAgent: 'test' };

    await service.createAdmin({
      email: 'parcours@exemple.com',
      displayName: 'Parcours Complet',
      password: 'Une phrase de passe très longue 2026',
    });
    await expect(
      service.login({ email: 'parcours@exemple.com', password: 'faux' }, context),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);

    const { token } = await service.login(
      { email: 'parcours@exemple.com', password: 'Une phrase de passe très longue 2026' },
      context,
    );
    const auth = await service.authenticate(token);
    expect(auth?.user.email).toBe('parcours@exemple.com');

    await service.logout(auth?.tokenHash ?? '', auth?.user.id ?? null);
    expect(await service.authenticate(token)).toBeNull();

    for (let i = 0; i < 5; i++) {
      await expect(service.login({ email: 'parcours@exemple.com', password: 'faux' }, context)).rejects.toThrow();
    }
    await expect(
      service.login({ email: 'parcours@exemple.com', password: 'Une phrase de passe très longue 2026' }, context),
    ).rejects.toBeInstanceOf(TooManyAttemptsError);
  });

  it('empêche le compte de l’application de modifier la structure', async () => {
    const error = await pool.query('DROP TABLE sessions').then(
      () => null,
      (caught: unknown) => caught as { errno?: number },
    );
    expect(error).not.toBeNull();
    expect([1044, 1142]).toContain(error?.errno);
  });
});
