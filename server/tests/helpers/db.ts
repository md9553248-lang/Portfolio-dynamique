import type { Connection, RowDataPacket } from 'mysql2/promise';

/*
 * Configuration des tests d'intégration MySQL.
 * Ils ne s'exécutent que si DB_TEST_NAME est défini ET se termine par "_test" :
 * la base de test est entièrement vidée, on ne risque donc jamais d'effacer la vraie base.
 */
const env = process.env;
export const testDbName = env['DB_TEST_NAME'] ?? '';

export const dbTestEnabled =
  testDbName.endsWith('_test') &&
  Boolean(env['DB_HOST'] && env['DB_USER'] && env['DB_PASSWORD']) &&
  Boolean(env['DB_MIGRATION_USER'] && env['DB_MIGRATION_PASSWORD']);

function baseOptions(user: string, password: string) {
  return {
    host: env['DB_HOST'],
    port: Number(env['DB_PORT'] ?? 3306),
    user,
    password,
    database: testDbName,
    charset: 'utf8mb4',
    timezone: 'Z',
  };
}

export function migratorOptions() {
  return {
    ...baseOptions(env['DB_MIGRATION_USER'] ?? '', env['DB_MIGRATION_PASSWORD'] ?? ''),
    multipleStatements: true,
  };
}

export function appOptions() {
  return baseOptions(env['DB_USER'] ?? '', env['DB_PASSWORD'] ?? '');
}

export async function resetDatabase(connection: Connection): Promise<void> {
  await connection.query('SET FOREIGN_KEY_CHECKS = 0');
  const [rows] = await connection.query<RowDataPacket[]>(
    'SELECT table_name AS name FROM information_schema.tables WHERE table_schema = DATABASE()',
  );
  for (const row of rows) {
    await connection.query(`DROP TABLE IF EXISTS \`${String(row['name'])}\``);
  }
  await connection.query('SET FOREIGN_KEY_CHECKS = 1');
}
