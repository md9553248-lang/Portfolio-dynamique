import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  computeChecksum,
  loadMigrationFiles,
  MigrationError,
  parseMigrationFilename,
  planMigrations,
  type AppliedMigration,
  type MigrationFile,
} from '../../src/db/migrator.js';

const MIGRATIONS_DIR = fileURLToPath(new URL('../../db/migrations', import.meta.url));

function fakeFile(version: number, sql = `-- migration ${version}`): MigrationFile {
  const name = `etape_${version}`;
  return {
    version,
    name,
    filename: `${String(version).padStart(4, '0')}_${name}.sql`,
    sql,
    checksum: computeChecksum(sql),
  };
}

function applied(file: MigrationFile): AppliedMigration {
  return { version: file.version, name: file.name, checksum: file.checksum };
}

describe('parseMigrationFilename', () => {
  it('accepte un nom valide', () => {
    expect(parseMigrationFilename('0003_portfolio_content.sql')).toEqual({
      version: 3,
      name: 'portfolio_content',
    });
  });

  it('refuse les noms invalides', () => {
    expect(parseMigrationFilename('3_court.sql')).toBeNull();
    expect(parseMigrationFilename('0001_Majuscules.sql')).toBeNull();
    expect(parseMigrationFilename('0001_espace invalide.sql')).toBeNull();
    expect(parseMigrationFilename('0001_ok.txt')).toBeNull();
  });
});

describe('computeChecksum', () => {
  it('ne dépend pas des fins de ligne Windows ou Linux', () => {
    expect(computeChecksum('a\r\nb\r\n')).toBe(computeChecksum('a\nb\n'));
  });

  it('change quand le contenu change', () => {
    expect(computeChecksum('SELECT 1;')).not.toBe(computeChecksum('SELECT 2;'));
  });
});

describe('planMigrations', () => {
  const files = [fakeFile(1), fakeFile(2), fakeFile(3)];

  it('renvoie tout si rien n’est appliqué', () => {
    expect(planMigrations(files, [])).toHaveLength(3);
  });

  it('renvoie seulement les migrations manquantes', () => {
    const pending = planMigrations(files, [applied(files[0]!), applied(files[1]!)]);
    expect(pending.map((file) => file.version)).toEqual([3]);
  });

  it('ne renvoie rien si tout est appliqué', () => {
    expect(planMigrations(files, files.map(applied))).toHaveLength(0);
  });

  it('refuse une migration déjà appliquée puis modifiée', () => {
    const modified = [fakeFile(1, '-- contenu modifié'), files[1]!, files[2]!];
    expect(() => planMigrations(modified, [applied(files[0]!)])).toThrow(MigrationError);
  });

  it('refuse un fichier de migration appliqué qui a disparu', () => {
    expect(() => planMigrations([files[0]!], [applied(files[0]!), applied(files[1]!)])).toThrow(
      MigrationError,
    );
  });

  it('refuse un historique avec un trou', () => {
    expect(() => planMigrations(files, [applied(files[1]!)])).toThrow(MigrationError);
  });
});

describe('fichiers de migration du projet', () => {
  it('sont nommés et numérotés correctement', async () => {
    const loaded = await loadMigrationFiles(MIGRATIONS_DIR);
    expect(loaded.length).toBeGreaterThan(0);
    loaded.forEach((file, index) => expect(file.version).toBe(index + 1));
  });

  it('ne gèrent ni les droits, ni la suppression de bases, ni le compte root', async () => {
    const filenames = (await readdir(MIGRATIONS_DIR)).filter((name) => name.endsWith('.sql'));
    for (const filename of filenames) {
      const sql = (await readFile(path.join(MIGRATIONS_DIR, filename), 'utf8')).toUpperCase();
      expect(sql, filename).not.toContain('DROP DATABASE');
      expect(sql, filename).not.toContain('GRANT ');
      expect(sql, filename).not.toContain('CREATE USER');
      expect(sql, filename).not.toContain("'ROOT'");
    }
  });

  it('utilisent partout le jeu de caractères utf8mb4 et le moteur InnoDB', async () => {
    const loaded = await loadMigrationFiles(MIGRATIONS_DIR);
    for (const file of loaded) {
      const tables = file.sql.match(/CREATE TABLE/g)?.length ?? 0;
      const withEngine = file.sql.match(/ENGINE=InnoDB DEFAULT CHARSET=utf8mb4/g)?.length ?? 0;
      expect(withEngine, file.filename).toBe(tables);
    }
  });
});
