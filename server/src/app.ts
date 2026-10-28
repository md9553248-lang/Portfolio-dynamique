import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import type { Logger } from 'pino';
import { createErrorHandler } from './middlewares/error-handler.js';
import { notFoundHandler } from './middlewares/not-found.js';
import { healthRouter } from './modules/health/health.routes.js';

export interface AppOptions {
  clientOrigin: string;
  logger: Logger;
}

export function createApp(options: AppOptions): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  // CORS n'est PAS un mécanisme d'authentification : il limite seulement les origines navigateur.
  app.use(cors({ origin: options.clientOrigin, credentials: true }));
  app.use(express.json({ limit: '100kb' }));

  app.use('/api/health', healthRouter);

  app.use(notFoundHandler);
  app.use(createErrorHandler(options.logger));

  return app;
}
