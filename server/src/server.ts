import 'dotenv/config';
import { createApp } from './app.js';
import { ConfigError, parseEnv, type Env } from './config/env.js';
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

const env = loadConfigOrExit();
const logger = createLogger(env.LOG_LEVEL);
const app = createApp({ clientOrigin: env.CLIENT_ORIGIN, logger });

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, 'Serveur démarré');
});

function shutdown(signal: string): void {
  logger.info({ signal }, 'Arrêt du serveur');
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
