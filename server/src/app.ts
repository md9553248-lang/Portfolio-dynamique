import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import type { Logger } from 'pino';
import type { AppDependencies } from './dependencies.js';
import { createErrorHandler } from './middlewares/error-handler.js';
import { noCache } from './middlewares/no-cache.js';
import { notFoundHandler } from './middlewares/not-found.js';
import { createRateLimiter, type RateLimitSettings } from './middlewares/rate-limit.js';
import { requestLogger } from './middlewares/request-logger.js';
import { createContactRouter } from './modules/contact/contact.routes.js';
import { createContactService } from './modules/contact/contact.service.js';
import { createPublicRouter } from './modules/content/content.routes.js';
import { createContentService } from './modules/content/content.service.js';
import { createHealthRouter } from './modules/health/health.routes.js';

export interface RateLimits {
  /** Lectures publiques : par adresse IP. */
  api: RateLimitSettings;
  /** Envoi du formulaire de contact : volontairement très strict. */
  contact: RateLimitSettings;
}

export const DEFAULT_RATE_LIMITS: RateLimits = {
  api: { windowMs: 15 * 60 * 1000, limit: 300 },
  contact: { windowMs: 60 * 60 * 1000, limit: 5 },
};

export interface AppOptions {
  clientOrigin: string;
  logger: Logger;
  deps: AppDependencies;
  /** Secret servant à calculer l'empreinte des adresses IP. */
  ipHashSecret: string;
  /** Nombre de reverse proxies devant l'application (0 = aucun). */
  trustProxy?: number;
  rateLimits?: Partial<RateLimits>;
}

export function createApp(options: AppOptions): Express {
  const app = express();
  const limits: RateLimits = { ...DEFAULT_RATE_LIMITS, ...options.rateLimits };

  app.disable('x-powered-by');
  if (options.trustProxy && options.trustProxy > 0) {
    app.set('trust proxy', options.trustProxy);
  }

  app.use(requestLogger(options.logger));
  app.use(helmet());
  // CORS n'est PAS un mécanisme d'authentification : il limite seulement les origines navigateur.
  app.use(cors({ origin: options.clientOrigin, credentials: true }));
  app.use(express.json({ limit: '20kb' }));
  app.use('/api', noCache);

  const contentService = createContentService(options.deps.content);
  const contactService = createContactService(options.deps.contact, {
    ipHashSecret: options.ipHashSecret,
    logger: options.logger,
  });

  const apiLimiter = createRateLimiter(
    limits.api,
    'Trop de requêtes. Réessayez dans quelques minutes.',
  );
  const contactLimiter = createRateLimiter(
    limits.contact,
    'Trop de messages envoyés. Réessayez plus tard.',
  );

  app.use('/api/health', createHealthRouter(options.deps.ping, options.logger));
  app.use('/api/public', apiLimiter, createPublicRouter(contentService));
  app.use('/api/contact', createContactRouter(contactService, contactLimiter));

  app.use(notFoundHandler);
  app.use(createErrorHandler(options.logger));

  return app;
}
