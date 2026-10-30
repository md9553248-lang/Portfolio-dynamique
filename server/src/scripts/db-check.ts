import 'dotenv/config';
import type { RowDataPacket } from 'mysql2/promise';
import { ConfigError, parseEnv } from '../config/env.js';
import { createAppPool } from '../db/pool.js';

/** Codes MySQL « accès refusé » attendus quand le compte n'a pas le droit de modifier la structure. */
const ACCESS_DENIED_ERRNO = [1044, 1142, 1227];

async function main(): Promise<void> {
  const env = parseEnv(process.env);
  const pool = createAppPool(env);
  const connection = await pool.getConnection();
  let problems = 0;

  try {
    const [info] = await connection.query<RowDataPacket[]>(
      'SELECT CURRENT_USER() AS account, VERSION() AS version, DATABASE() AS db',
    );
    console.log(
      `Connexion réussie : compte ${info[0]?.['account']}, MySQL ${info[0]?.['version']}`,
    );

    const [tables] = await connection.query<RowDataPacket[]>(
      'SELECT COUNT(*) AS total FROM information_schema.tables WHERE table_schema = DATABASE()',
    );
    const total = Number(tables[0]?.['total']);
    console.log(`Tables présentes dans ${info[0]?.['db']} : ${total}`);
    if (total === 0) {
      console.log('  ✘ Aucune table : lancez « npm run db:migrate ».');
      problems += 1;
    }

    // Test du principe du moindre privilège : le compte de l'application ne doit PAS pouvoir créer de table.
    try {
      await connection.query('CREATE TABLE `__controle_privileges` (id INT)');
      await connection.query('DROP TABLE `__controle_privileges`');
      console.log(
        '  ✘ DANGER : le compte de l’application peut créer des tables (droits trop larges).',
      );
      problems += 1;
    } catch (error) {
      const errno = (error as { errno?: number }).errno;
      if (errno !== undefined && ACCESS_DENIED_ERRNO.includes(errno)) {
        console.log(
          '  ✔ Le compte de l’application ne peut pas modifier la structure (droits minimaux).',
        );
      } else {
        console.log(
          `  ✘ Résultat inattendu pendant le test de privilèges (code ${errno ?? 'inconnu'}).`,
        );
        problems += 1;
      }
    }
  } finally {
    connection.release();
    await pool.end();
  }

  if (problems > 0) process.exitCode = 1;
}

main().catch((error: unknown) => {
  if (error instanceof ConfigError) {
    console.error(error.message);
  } else {
    const { code, message } = error as { code?: string; message?: string };
    console.error(`Erreur : ${code ?? 'inconnue'} ${message ?? ''}`.trim());
  }
  process.exitCode = 1;
});
