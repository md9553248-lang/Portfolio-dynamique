import type { Pool } from 'mysql2/promise';
import type { AuditEntry, AuditRepository } from './audit.repository.js';

export function createMysqlAuditRepository(pool: Pool): AuditRepository {
  return {
    async log(entry: AuditEntry) {
      await pool.execute(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_hash, created_at)
         VALUES (?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
        [
          entry.userId,
          entry.action,
          entry.entityType ?? null,
          entry.entityId ?? null,
          entry.details ? JSON.stringify(entry.details) : null,
          entry.ipHash ?? null,
        ],
      );
    },
  };
}
