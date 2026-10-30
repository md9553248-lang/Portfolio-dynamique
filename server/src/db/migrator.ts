import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Connection, RowDataPacket } from 'mysql2/promise';

export interface MigrationFile {
  version: number;
  name: string;
  filename: string;
  sql: string;
  checksum: string;
}

export interface AppliedMigration {
  version: number;
  name: string;
  checksum: string;
}

export class MigrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MigrationError';
  }
}

const FILENAME_PATTERN = /^(\d{4})_([a-z0-9_]+)\.sql$/;
const LOCK_NAME = 'portfolio_schema_migrations';

export function parseMigrationFilename(filename: string): { version: number; name: string } | null {
  const match = FILENAME_PATTERN.exec(filename);
  if (!match) return null;
  return { version: Number(match[1]), name: match[2] ?? '' };
}

/** Empreinte du contenu. Les fins de ligne sont normalisées pour éviter les écarts Windows/Linux. */
export function computeChecksum(sql: string): string {
  return createHash('sha256').update(sql.replace(/\r\n/g, '\n')).digest('hex');
}

/** Lit les fichiers de migration d'un dossier, vérifie leur nommage et leur numérotation. */
export async function loadMigrationFiles(directory: string): Promise<MigrationFile[]> {
  const entries = (await readdir(directory)).filter((name) => name.endsWith('.sql')).sort();
  const files: MigrationFile[] = [];

  for (const filename of entries) {
    const parsed = parseMigrationFilename(filename);
    if (!parsed) {
      throw new MigrationError(
        `Nom de migration invalide : ${filename} (attendu : 0001_description_en_minuscules.sql)`,
      );
    }
    const sql = await readFile(path.join(directory, filename), 'utf8');
    files.push({ ...parsed, filename, sql, checksum: computeChecksum(sql) });
  }

  files.forEach((file, index) => {
    if (file.version !== index + 1) {
      throw new MigrationError(
        `Numérotation incorrecte : ${file.filename} devrait porter le numéro ${String(index + 1).padStart(4, '0')} (pas de trou ni de doublon).`,
      );
    }
  });

  return files;
}

/**
 * Compare les fichiers aux migrations déjà appliquées et renvoie celles qui restent à appliquer.
 * Refuse de continuer si une migration déjà appliquée a été modifiée ou a disparu.
 */
export function planMigrations(
  files: readonly MigrationFile[],
  applied: readonly AppliedMigration[],
): MigrationFile[] {
  const sortedApplied = [...applied].sort((a, b) => a.version - b.version);

  sortedApplied.forEach((migration, index) => {
    if (migration.version !== index + 1) {
      throw new MigrationError(
        `Historique incohérent : la migration ${String(index + 1).padStart(4, '0')} est absente de la base.`,
      );
    }
    const file = files.find((candidate) => candidate.version === migration.version);
    if (!file) {
      throw new MigrationError(
        `La migration ${migration.version} (${migration.name}) est appliquée mais son fichier n'existe plus.`,
      );
    }
    if (file.checksum !== migration.checksum) {
      throw new MigrationError(
        `La migration ${file.filename} a été modifiée après son application. Ne modifiez jamais une migration déjà appliquée : créez-en une nouvelle.`,
      );
    }
  });

  return files.slice(sortedApplied.length);
}

async function ensureMigrationsTable(connection: Connection): Promise<void> {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    SMALLINT UNSIGNED NOT NULL,
      name       VARCHAR(100)      NOT NULL,
      checksum   CHAR(64)          NOT NULL,
      applied_at DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (version)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

export async function fetchAppliedMigrations(connection: Connection): Promise<AppliedMigration[]> {
  await ensureMigrationsTable(connection);
  const [rows] = await connection.query<RowDataPacket[]>(
    'SELECT version, name, checksum FROM schema_migrations ORDER BY version',
  );
  return rows.map((row) => ({
    version: Number(row['version']),
    name: String(row['name']),
    checksum: String(row['checksum']),
  }));
}

/** État des migrations : lesquelles sont appliquées, lesquelles restent à faire. */
export async function getMigrationStatus(
  connection: Connection,
  files: readonly MigrationFile[],
): Promise<{ applied: AppliedMigration[]; pending: MigrationFile[] }> {
  const applied = await fetchAppliedMigrations(connection);
  const pending = planMigrations(files, applied);
  return { applied, pending };
}

/**
 * Applique les migrations en attente, dans l'ordre.
 * Attention : MySQL valide automatiquement chaque instruction de structure (CREATE, ALTER...), on ne
 * peut donc pas annuler une migration à moitié exécutée. En cas d'échec, on s'arrête immédiatement.
 */
export async function runMigrations(
  connection: Connection,
  files: readonly MigrationFile[],
  log: (message: string) => void = () => {},
): Promise<MigrationFile[]> {
  const [lockRows] = await connection.query<RowDataPacket[]>('SELECT GET_LOCK(?, 10) AS acquired', [
    LOCK_NAME,
  ]);
  if (Number(lockRows[0]?.['acquired']) !== 1) {
    throw new MigrationError('Une autre exécution de migrations est déjà en cours.');
  }

  try {
    const applied = await fetchAppliedMigrations(connection);
    const pending = planMigrations(files, applied);

    for (const file of pending) {
      log(`Application de ${file.filename}…`);
      await connection.query(file.sql);
      await connection.execute(
        'INSERT INTO schema_migrations (version, name, checksum) VALUES (?, ?, ?)',
        [file.version, file.name, file.checksum],
      );
    }
    return pending;
  } finally {
    await connection.query('SELECT RELEASE_LOCK(?)', [LOCK_NAME]);
  }
}
