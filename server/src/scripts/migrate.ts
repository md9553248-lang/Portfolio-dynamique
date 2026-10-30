import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { ConfigError, parseEnv } from '../config/env.js';
import { migrationConnectionOptions } from '../db/config.js';
import {
  getMigrationStatus,
  loadMigrationFiles,
  MigrationError,
  runMigrations,
} from '../db/migrator.js';

// server/db/migrations (même chemin relatif depuis src/scripts et depuis dist/scripts)
const MIGRATIONS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../db/migrations',
);

async function main(): Promise<void> {
  const command = process.argv[2];
  if (command !== 'up' && command !== 'status') {
    console.error('Usage : npm run db:migrate   (appliquer)   |   npm run db:status   (état)');
    process.exitCode = 1;
    return;
  }

  const env = parseEnv(process.env);
  const files = await loadMigrationFiles(MIGRATIONS_DIR);
  const connection = await mysql.createConnection(migrationConnectionOptions(env));

  try {
    if (command === 'status') {
      const { applied, pending } = await getMigrationStatus(connection, files);
      console.log(`Base : ${env.DB_NAME}`);
      console.log(`Migrations appliquées : ${applied.length}`);
      applied.forEach((migration) => console.log(`  ✔ ${migration.version} ${migration.name}`));
      console.log(`Migrations en attente : ${pending.length}`);
      pending.forEach((migration) => console.log(`  • ${migration.filename}`));
      return;
    }

    const applied = await runMigrations(connection, files, console.log);
    console.log(
      applied.length === 0
        ? 'Base déjà à jour : aucune migration à appliquer.'
        : `${applied.length} migration(s) appliquée(s) avec succès.`,
    );
  } finally {
    await connection.end();
  }
}

main().catch((error: unknown) => {
  if (error instanceof ConfigError || error instanceof MigrationError) {
    console.error(error.message);
  } else {
    // On n'affiche que le code et le message MySQL, jamais les paramètres de connexion.
    const { code, message } = error as { code?: string; message?: string };
    console.error(`Erreur : ${code ?? 'inconnue'} ${message ?? ''}`.trim());
  }
  process.exitCode = 1;
});
