import type { ConnectionOptions, PoolOptions } from 'mysql2/promise';
import { ConfigError, type Env } from '../config/env.js';

function requireKeys<K extends keyof Env>(env: Env, keys: readonly K[]): void {
  const missing = keys.filter((key) => env[key] === undefined);
  if (missing.length > 0) {
    throw new ConfigError(
      `Configuration de la base incomplète. Variables manquantes : ${missing.join(', ')}`,
    );
  }
}

function baseOptions(env: Env): ConnectionOptions {
  requireKeys(env, ['DB_HOST', 'DB_NAME'] as const);
  return {
    host: env.DB_HOST,
    port: env.DB_PORT ?? 3306,
    database: env.DB_NAME,
    charset: 'utf8mb4',
    timezone: 'Z', // les dates sont lues et écrites en UTC
    connectTimeout: 10_000,
    // En production avec une base distante, activez DB_SSL=true (connexion chiffrée).
    ssl: env.DB_SSL ? { rejectUnauthorized: true } : undefined,
    // Une seule requête par appel : limite fortement les dégâts d'une éventuelle injection SQL.
    multipleStatements: false,
  };
}

/** Connexion de l'application : compte aux droits minimaux (lecture/écriture des données). */
export function appPoolOptions(env: Env): PoolOptions {
  requireKeys(env, ['DB_USER', 'DB_PASSWORD'] as const);
  return {
    ...baseOptions(env),
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 50,
  };
}

/**
 * Connexion pour les migrations : compte autorisé à modifier la structure.
 * Réservée à la commande « npm run db:migrate » : le site n'utilise jamais ce compte.
 */
export function migrationConnectionOptions(env: Env): ConnectionOptions {
  requireKeys(env, ['DB_MIGRATION_USER', 'DB_MIGRATION_PASSWORD'] as const);
  return {
    ...baseOptions(env),
    user: env.DB_MIGRATION_USER,
    password: env.DB_MIGRATION_PASSWORD,
    // Nécessaire pour exécuter un fichier de migration (plusieurs instructions SQL).
    // Acceptable ici : les fichiers de migration sont écrits par nous, jamais par un visiteur.
    multipleStatements: true,
  };
}
