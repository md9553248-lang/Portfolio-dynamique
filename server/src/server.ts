import 'dotenv/config';
import type { Pool } from 'mysql2/promise';
import { createApp } from './app.js';
import { ConfigError, parseEnv, type Env } from './config/env.js';
import { createAppPool } from './db/pool.js';
import { createMysqlDependencies } from './dependencies.js';
import { createLogger } from './logging/logger.js';
import { createAuthService } from './modules/auth/auth.service.js';
import { createArgon2Hasher } from './modules/auth/password-hasher.js';
import { deriveSecret } from './utils/secrets.js';

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

  // Un secret distinct par usage, tous dérivés de SESSION_SECRET (obligatoire en production).
  const baseSecret = env.SESSION_SECRET ?? 'secret-de-developpement';
  const ipHashSecret = deriveSecret(baseSecret, 'ip-hash');
  const csrfSecret = deriveSecret(baseSecret, 'csrf');

  const deps = createMysqlDependencies(pool);
  const authService = createAuthService({
    repo: deps.auth,
    hasher: createArgon2Hasher(),
    ipHashSecret,
    absoluteSessionSeconds: env.SESSION_ABSOLUTE_HOURS * 3600,
    idleSessionSeconds: env.SESSION_IDLE_MINUTES * 60,
    logger,
  });

  // Nettoyage des sessions expirées et des anciennes tentatives de connexion : au démarrage, puis toutes les heures.
  const purge = () =>
    authService.purge().catch((error: unknown) => {
      logger.error({ code: (error as { code?: string }).code }, 'Échec du nettoyage des sessions');
    });
  void purge();
  setInterval(() => void purge(), 60 * 60 * 1000).unref();

  const isProduction = env.NODE_ENV === 'production';
  const app = createApp({
    clientOrigin: env.CLIENT_ORIGIN,
    logger,
    deps,
    authService,
    session: {
      // En production : cookie réservé à ce domaine (préfixe __Host-) et transmis uniquement en HTTPS.
      cookie: { name: isProduction ? '__Host-portfolio_session' : 'portfolio_session', secure: isProduction },
      csrfSecret,
    },
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
