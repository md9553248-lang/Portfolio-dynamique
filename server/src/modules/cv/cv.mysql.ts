import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import type { CvRepository, CvStatus, CvVersion } from './cv.repository.js';

const SELECT_VERSION = `
  SELECT cv.id, cv.status, cv.media_id, m.storage_key, m.original_name, m.size_bytes, m.sha256,
         DATE_FORMAT(cv.created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at,
         DATE_FORMAT(cv.published_at, '%Y-%m-%dT%H:%i:%sZ') AS published_at
    FROM cv_versions cv
    JOIN media m ON m.id = cv.media_id`;

function toVersion(row: RowDataPacket): CvVersion {
  return {
    id: Number(row['id']),
    status: String(row['status']) as CvStatus,
    mediaId: Number(row['media_id']),
    storageKey: String(row['storage_key']),
    originalName: String(row['original_name']),
    sizeBytes: Number(row['size_bytes']),
    sha256: String(row['sha256']),
    createdAt: String(row['created_at']),
    publishedAt: typeof row['published_at'] === 'string' ? row['published_at'] : null,
  };
}

export function createMysqlCvRepository(pool: Pool): CvRepository {
  /** Exécute des instructions dans UNE transaction : tout réussit ou rien n'est modifié. */
  async function inTransaction<T>(work: (connection: PoolConnection) => Promise<T>): Promise<T> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const result = await work(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  return {
    async list() {
      const [rows] = await pool.execute<RowDataPacket[]>(`${SELECT_VERSION} ORDER BY cv.id DESC`);
      return rows.map(toVersion);
    },

    async findById(id) {
      const [rows] = await pool.execute<RowDataPacket[]>(`${SELECT_VERSION} WHERE cv.id = ?`, [id]);
      return rows[0] ? toVersion(rows[0]) : null;
    },

    async findPublished() {
      const [rows] = await pool.execute<RowDataPacket[]>(`${SELECT_VERSION} WHERE cv.status = 'published' LIMIT 1`);
      return rows[0] ? toVersion(rows[0]) : null;
    },

    async createDraft({ file, uploadedBy }) {
      return inTransaction(async (connection) => {
        // Un seul brouillon à la fois : l'ancien est supprimé, seulement si le nouveau est bien enregistré (même transaction).
        const [old] = await connection.execute<RowDataPacket[]>(
          `SELECT cv.id AS version_id, m.id AS media_id, m.storage_key
             FROM cv_versions cv JOIN media m ON m.id = cv.media_id
            WHERE cv.status = 'draft' FOR UPDATE`,
        );
        for (const row of old) {
          await connection.execute('DELETE FROM cv_versions WHERE id = ?', [Number(row['version_id'])]);
          await connection.execute('DELETE FROM media WHERE id = ?', [Number(row['media_id'])]);
        }

        const [media] = await connection.execute<ResultSetHeader>(
          `INSERT INTO media (storage_key, original_name, mime_type, size_bytes, sha256, visibility, uploaded_by, created_at)
           VALUES (?, ?, 'application/pdf', ?, ?, 'private', ?, UTC_TIMESTAMP())`,
          [file.storageKey, file.originalName, file.sizeBytes, file.sha256, uploadedBy],
        );
        const [version] = await connection.execute<ResultSetHeader>(
          `INSERT INTO cv_versions (media_id, status, uploaded_by, created_at)
           VALUES (?, 'draft', ?, UTC_TIMESTAMP())`,
          [media.insertId, uploadedBy],
        );
        return { versionId: version.insertId, replacedKeys: old.map((row) => String(row['storage_key'])) };
      });
    },

    async publish(id) {
      return inTransaction(async (connection) => {
        const [rows] = await connection.execute<RowDataPacket[]>(
          'SELECT status FROM cv_versions WHERE id = ? FOR UPDATE',
          [id],
        );
        const row = rows[0];
        if (!row) return 'not_found';
        if (String(row['status']) === 'published') return 'published';

        await connection.execute("UPDATE cv_versions SET status = 'archived' WHERE status = 'published'");
        await connection.execute(
          "UPDATE cv_versions SET status = 'published', published_at = UTC_TIMESTAMP() WHERE id = ?",
          [id],
        );
        return 'published';
      });
    },

    async unpublish() {
      const [result] = await pool.execute<ResultSetHeader>(
        "UPDATE cv_versions SET status = 'archived' WHERE status = 'published'",
      );
      return result.affectedRows > 0;
    },

    async deleteVersion(id) {
      return inTransaction(async (connection) => {
        const [rows] = await connection.execute<RowDataPacket[]>(
          `SELECT cv.status, m.id AS media_id, m.storage_key
             FROM cv_versions cv JOIN media m ON m.id = cv.media_id
            WHERE cv.id = ? FOR UPDATE`,
          [id],
        );
        const row = rows[0];
        if (!row) return { result: 'not_found' as const };
        if (String(row['status']) === 'published') return { result: 'is_published' as const };

        await connection.execute('DELETE FROM cv_versions WHERE id = ?', [id]);
        await connection.execute('DELETE FROM media WHERE id = ?', [Number(row['media_id'])]);
        return { result: 'deleted' as const, storageKey: String(row['storage_key']) };
      });
    },
  };
}
