import type { Pool, RowDataPacket } from 'mysql2/promise';
import type { DashboardRepository } from './dashboard.repository.js';

/** Statistiques calculées à partir des vraies données de la base (jamais de chiffres inventés). */
export function createMysqlDashboardRepository(pool: Pool): DashboardRepository {
  return {
    async getStats() {
      const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT
           (SELECT COUNT(*) FROM projects WHERE status = 'published') AS projects_published,
           (SELECT COUNT(*) FROM projects WHERE status = 'draft') AS projects_draft,
           (SELECT COUNT(*) FROM articles WHERE status = 'published') AS articles_published,
           (SELECT COUNT(*) FROM articles WHERE status = 'draft') AS articles_draft,
           (SELECT COUNT(*) FROM messages) AS messages_total,
           (SELECT COUNT(*) FROM messages WHERE status = 'unread') AS messages_unread,
           (SELECT COUNT(*) FROM media m WHERE NOT EXISTS (SELECT 1 FROM cv_versions c WHERE c.media_id = m.id)) AS media_total,
           (SELECT DATE_FORMAT(published_at, '%Y-%m-%dT%H:%i:%sZ') FROM cv_versions WHERE status = 'published' LIMIT 1) AS cv_published_at,
           (SELECT COUNT(*) FROM audit_logs
             WHERE action = 'auth.login_failed' AND created_at > DATE_SUB(UTC_TIMESTAMP(), INTERVAL 24 HOUR)) AS failed_logins`,
      );
      const row = rows[0];
      const count = (name: string) => Number(row?.[name] ?? 0);
      const cvDate = row?.['cv_published_at'];
      return {
        projects: { published: count('projects_published'), draft: count('projects_draft') },
        articles: { published: count('articles_published'), draft: count('articles_draft') },
        messages: { total: count('messages_total'), unread: count('messages_unread') },
        media: { total: count('media_total') },
        cv: { publishedAt: typeof cvDate === 'string' ? cvDate : null },
        security: { failedLogins24h: count('failed_logins') },
      };
    },

    async getRecentActivity() {
      const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT a.action, a.entity_type, u.display_name,
                DATE_FORMAT(a.created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at
           FROM audit_logs a
           LEFT JOIN users u ON u.id = a.user_id
          WHERE a.action NOT IN ('auth.login_failed', 'auth.login_throttled')
          ORDER BY a.id DESC
          LIMIT 10`,
      );
      return rows.map((row) => ({
        action: String(row['action']),
        entityType: typeof row['entity_type'] === 'string' ? row['entity_type'] : null,
        createdAt: String(row['created_at']),
        actor: typeof row['display_name'] === 'string' ? row['display_name'] : null,
      }));
    },
  };
}
