import type { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import type { AuthRepository, FailureStats, PublicUser, UserRecord } from './auth.repository.js';
import { THROTTLE_WINDOW_MINUTES } from './login-throttle.js';

/*
 * Implémentation MySQL de l'authentification.
 * - Requêtes préparées uniquement.
 * - Toutes les dates sont écrites et comparées avec UTC_TIMESTAMP() : aucun décalage de fuseau horaire possible.
 * - Les mots de passe sont des empreintes Argon2id ; les jetons de session ne sont stockés que sous forme d'empreinte.
 */

type Param = string | number | null;

async function select(pool: Pool, sql: string, params: Param[] = []): Promise<RowDataPacket[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(sql, params);
  return rows;
}

async function run(pool: Pool, sql: string, params: Param[] = []): Promise<ResultSetHeader> {
  const [result] = await pool.execute<ResultSetHeader>(sql, params);
  return result;
}

function toUserRecord(row: RowDataPacket): UserRecord {
  return {
    id: Number(row['id']),
    email: String(row['email']),
    displayName: String(row['display_name']),
    role: String(row['role']),
    passwordHash: String(row['password_hash']),
    isActive: Number(row['is_active']) === 1,
  };
}

const NEVER = 999_999_999;

async function failureCounts(pool: Pool, sql: string, params: Param[]): Promise<FailureStats['pair']> {
  const rows = await select(pool, sql, params);
  const row = rows[0];
  const since = row?.['since_last'];
  return {
    count: Number(row?.['total'] ?? 0),
    secondsSinceLast: since === null || since === undefined ? NEVER : Number(since),
  };
}

export function createMysqlAuthRepository(pool: Pool): AuthRepository {
  const windowSql = `attempted_at > DATE_SUB(UTC_TIMESTAMP(), INTERVAL ${THROTTLE_WINDOW_MINUTES} MINUTE)`;

  return {
    async countUsers() {
      const rows = await select(pool, 'SELECT COUNT(*) AS total FROM users');
      return Number(rows[0]?.['total'] ?? 0);
    },

    async findUserByEmail(email) {
      const rows = await select(
        pool,
        'SELECT id, email, password_hash, display_name, role, is_active FROM users WHERE email = ?',
        [email],
      );
      return rows[0] ? toUserRecord(rows[0]) : null;
    },

    async findUserById(id) {
      const rows = await select(
        pool,
        'SELECT id, email, password_hash, display_name, role, is_active FROM users WHERE id = ?',
        [id],
      );
      return rows[0] ? toUserRecord(rows[0]) : null;
    },

    async createUser({ email, passwordHash, displayName }) {
      const result = await run(
        pool,
        `INSERT INTO users (email, password_hash, display_name, created_at, updated_at)
         VALUES (?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
        [email, passwordHash, displayName],
      );
      return result.insertId;
    },

    async updatePasswordHash(userId, passwordHash) {
      await run(pool, 'UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, userId]);
    },

    async touchLastLogin(userId) {
      await run(pool, 'UPDATE users SET last_login_at = UTC_TIMESTAMP() WHERE id = ?', [userId]);
    },

    async createSession({ tokenHash, userId, ipHash, userAgent, absoluteSeconds }) {
      await run(
        pool,
        `INSERT INTO sessions (token_hash, user_id, created_at, last_seen_at, expires_at, ip_hash, user_agent)
         VALUES (?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP(), DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? SECOND), ?, ?)`,
        [tokenHash, userId, absoluteSeconds, ipHash, userAgent],
      );
    },

    async findActiveSession(tokenHash, idleSeconds) {
      const rows = await select(
        pool,
        `SELECT u.id, u.email, u.display_name, u.role,
                TIMESTAMPDIFF(SECOND, s.last_seen_at, UTC_TIMESTAMP()) AS idle_seconds
           FROM sessions s
           JOIN users u ON u.id = s.user_id
          WHERE s.token_hash = ?
            AND u.is_active = 1
            AND s.expires_at > UTC_TIMESTAMP()
            AND s.last_seen_at > DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? SECOND)`,
        [tokenHash, idleSeconds],
      );
      const row = rows[0];
      if (!row) return null;
      const user: PublicUser = {
        id: Number(row['id']),
        email: String(row['email']),
        displayName: String(row['display_name']),
        role: String(row['role']),
      };
      return { user, idleSeconds: Number(row['idle_seconds']) };
    },

    async touchSession(tokenHash) {
      await run(pool, 'UPDATE sessions SET last_seen_at = UTC_TIMESTAMP() WHERE token_hash = ?', [tokenHash]);
    },

    async deleteSession(tokenHash) {
      await run(pool, 'DELETE FROM sessions WHERE token_hash = ?', [tokenHash]);
    },

    async deleteSessionsForUser(userId, exceptTokenHash) {
      if (exceptTokenHash) {
        await run(pool, 'DELETE FROM sessions WHERE user_id = ? AND token_hash <> ?', [userId, exceptTokenHash]);
      } else {
        await run(pool, 'DELETE FROM sessions WHERE user_id = ?', [userId]);
      }
    },

    async deleteExpiredSessions(idleSeconds) {
      await run(
        pool,
        `DELETE FROM sessions
          WHERE expires_at <= UTC_TIMESTAMP()
             OR last_seen_at <= DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? SECOND)`,
        [idleSeconds],
      );
    },

    async recordLoginAttempt({ identifierHash, ipHash, succeeded }) {
      await run(
        pool,
        'INSERT INTO login_attempts (identifier_hash, ip_hash, succeeded, attempted_at) VALUES (?, ?, ?, UTC_TIMESTAMP())',
        [identifierHash, ipHash, succeeded ? 1 : 0],
      );
    },

    async clearFailedAttempts({ identifierHash, ipHash }) {
      await run(pool, 'DELETE FROM login_attempts WHERE identifier_hash = ? AND ip_hash = ? AND succeeded = 0', [
        identifierHash,
        ipHash,
      ]);
    },

    async getFailureStats({ identifierHash, ipHash }) {
      const pair = await failureCounts(
        pool,
        `SELECT COUNT(*) AS total, TIMESTAMPDIFF(SECOND, MAX(attempted_at), UTC_TIMESTAMP()) AS since_last
           FROM login_attempts
          WHERE identifier_hash = ? AND ip_hash = ? AND succeeded = 0 AND ${windowSql}`,
        [identifierHash, ipHash],
      );
      const identifier = await failureCounts(
        pool,
        `SELECT COUNT(*) AS total, TIMESTAMPDIFF(SECOND, MAX(attempted_at), UTC_TIMESTAMP()) AS since_last
           FROM login_attempts
          WHERE identifier_hash = ? AND succeeded = 0 AND ${windowSql}`,
        [identifierHash],
      );
      return { pair, identifier };
    },

    async purgeOldLoginAttempts() {
      await run(pool, 'DELETE FROM login_attempts WHERE attempted_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 30 DAY)');
    },

    async writeAudit({ userId, action, ipHash, details }) {
      await run(
        pool,
        `INSERT INTO audit_logs (user_id, action, details, ip_hash, created_at)
         VALUES (?, ?, ?, ?, UTC_TIMESTAMP())`,
        [userId, action, details ? JSON.stringify(details) : null, ipHash ?? null],
      );
    },
  };
}
