import 'dotenv/config';
import { createHmac } from 'node:crypto';
import type { Pool } from 'mysql2/promise';
import { createApp } from './app.js';
import { ConfigError, parseEnv, type Env } from './config/env.js';
import { createAppPool } from './db/pool.js';
import { createMysqlDependencies } from './dependencies.js';
import { createLogger } from './logging/logger.js';

function loadConfigOrExit(): Env {
  try {
    return parseEnv(process.env);
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error(error.message);
      process.exit(1);
    }
    throw error;
  }
}

function createPoolOrExit(env: Env): Pool {
  try {
    return createAppPool(env);
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error(error.message);
      process.exit(1);
    }
    throw error;
  }
}

async function main(): Promise<void> {
  const env = loadConfigOrExit();
  const logger = createLogger(env.LOG_LEVEL);
  const pool = createPoolOrExit(env);

  // On échoue tout de suite, avec un message clair, si MySQL est injoignable.
  try {
    await pool.query('SELECT 1');
  } catch (error) {
    logger.fatal(
      { code: (error as { code?: string }).code },
      'Impossible de joindre MySQL : vérifiez que le service tourne et que server/.env est correct',
    );
    process.exit(1);
  }

  // Clé dérivée du secret de session : l'empreinte des IP ne peut pas être recalculée sans le secret.
  const ipHashSecret = createHmac('sha256', env.SESSION_SECRET ?? 'secret-de-developpement')
    .update('portfolio:ip-hash:v1')
    .digest('hex');

  const app = createApp({
    clientOrigin: env.CLIENT_ORIGIN,
    logger,
    deps: createMysqlDependencies(pool),
    ipHashSecret,
    trustProxy: env.TRUST_PROXY,
  });

  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, 'Serveur démarré');
  });

  function shutdown(signal: string): void {
    logger.info({ signal }, 'Arrêt du serveur');
    server.close(() => {
      void pool.end().finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

void main();
