import type { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import type {
  MediaKindFilter,
  MediaRecord,
  MediaRepository,
  MediaUsage,
  MediaVisibility,
} from './media.repository.js';

type Param = string | number | null;

const COLUMNS = `m.id, m.storage_key, m.original_name, m.mime_type, m.size_bytes, m.sha256, m.visibility, m.alt_text,
       DATE_FORMAT(m.created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at`;

function toRecord(row: RowDataPacket): MediaRecord {
  return {
    id: Number(row['id']),
    storageKey: String(row['storage_key']),
    originalName: String(row['original_name']),
    mimeType: String(row['mime_type']),
    sizeBytes: Number(row['size_bytes']),
    sha256: String(row['sha256']),
    visibility: String(row['visibility']) as MediaVisibility,
    altText: typeof row['alt_text'] === 'string' ? row['alt_text'] : null,
    createdAt: String(row['created_at']),
  };
}

const NOT_A_CV = 'NOT EXISTS (SELECT 1 FROM cv_versions c WHERE c.media_id = m.id)';

export function createMysqlMediaRepository(pool: Pool): MediaRepository {
  const select = async (sql: string, params: Param[] = []) => {
    const [rows] = await pool.execute<RowDataPacket[]>(sql, params);
    return rows;
  };

  return {
    async insert(media) {
      const [result] = await pool.execute<ResultSetHeader>(
        `INSERT INTO media (storage_key, original_name, mime_type, size_bytes, sha256, visibility, alt_text, uploaded_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
        [
          media.storageKey,
          media.originalName,
          media.mimeType,
          media.sizeBytes,
          media.sha256,
          media.visibility,
          media.altText,
          media.uploadedBy,
        ],
      );
      return result.insertId;
    },

    async list(kind: MediaKindFilter) {
      const filter =
        kind === 'image'
          ? "AND m.mime_type LIKE 'image/%'"
          : kind === 'document'
            ? "AND m.mime_type = 'application/pdf'"
            : '';
      const rows = await select(`SELECT ${COLUMNS} FROM media m WHERE ${NOT_A_CV} ${filter} ORDER BY m.id DESC`);
      return rows.map(toRecord);
    },

    async findById(id) {
      const rows = await select(`SELECT ${COLUMNS} FROM media m WHERE m.id = ?`, [id]);
      return rows[0] ? toRecord(rows[0]) : null;
    },

    async findPublicByKey(storageKey) {
      const rows = await select(
        `SELECT ${COLUMNS} FROM media m WHERE m.storage_key = ? AND m.visibility = 'public' AND ${NOT_A_CV}`,
        [storageKey],
      );
      return rows[0] ? toRecord(rows[0]) : null;
    },

    async update(id, patch) {
      const [result] = await pool.execute<ResultSetHeader>(
        'UPDATE media SET alt_text = ?, visibility = ? WHERE id = ?',
        [patch.altText, patch.visibility, id],
      );
      return result.affectedRows > 0;
    },

    async replaceFile(id, file) {
      const [result] = await pool.execute<ResultSetHeader>(
        'UPDATE media SET storage_key = ?, original_name = ?, mime_type = ?, size_bytes = ?, sha256 = ? WHERE id = ?',
        [file.storageKey, file.originalName, file.mimeType, file.sizeBytes, file.sha256, id],
      );
      return result.affectedRows > 0;
    },

    async findUsages(id): Promise<MediaUsage[]> {
      const rows = await select(
        `SELECT 'Projet (image principale)' AS place, p.slug AS label FROM projects p WHERE p.cover_media_id = ?
         UNION ALL SELECT 'Projet (galerie)', p.slug FROM project_images pi JOIN projects p ON p.id = pi.project_id WHERE pi.media_id = ?
         UNION ALL SELECT 'Photo du profil', 'profil' FROM profile WHERE photo_media_id = ?
         UNION ALL SELECT 'Article (image)', a.slug FROM articles a WHERE a.cover_media_id = ?
         UNION ALL SELECT 'Certification', c.name FROM certifications c WHERE c.media_id = ?
         UNION ALL SELECT 'CV', 'version de CV' FROM cv_versions WHERE media_id = ?`,
        [id, id, id, id, id, id],
      );
      return rows.map((row) => ({ where: String(row['place']), label: String(row['label']) }));
    },

    async delete(id) {
      await pool.execute('DELETE FROM media WHERE id = ?', [id]);
    },
  };
}
