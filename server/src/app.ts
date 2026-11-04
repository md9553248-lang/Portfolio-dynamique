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
import { createAdminRouter } from './modules/auth/admin.routes.js';
import { createAuthMiddlewares } from './modules/auth/auth.middleware.js';
import { createAuthRouter, type SessionCookieSettings } from './modules/auth/auth.routes.js';
import type { AuthService } from './modules/auth/auth.service.js';
import { createContactRouter } from './modules/contact/contact.routes.js';
import { createContactService } from './modules/contact/contact.service.js';
import { createPublicRouter } from './modules/content/content.routes.js';
import { createContentService } from './modules/content/content.service.js';
import { createHealthRouter } from './modules/health/health.routes.js';

export interface RateLimits {
  /** Lectures publiques et routes d'administration : par adresse IP. */
  api: RateLimitSettings;
  /** Envoi du formulaire de contact : volontairement très strict. */
  contact: RateLimitSettings;
  /** Routes d'authentification (hors connexion). */
  auth: RateLimitSettings;
  /** Tentatives de connexion : très strict (en plus du délai progressif par compte). */
  login: RateLimitSettings;
}

export const DEFAULT_RATE_LIMITS: RateLimits = {
  api: { windowMs: 15 * 60 * 1000, limit: 300 },
  contact: { windowMs: 60 * 60 * 1000, limit: 5 },
  auth: { windowMs: 15 * 60 * 1000, limit: 60 },
  login: { windowMs: 15 * 60 * 1000, limit: 10 },
};

export interface AppOptions {
  clientOrigin: string;
  logger: Logger;
  deps: AppDependencies;
  authService: AuthService;
  session: {
    cookie: SessionCookieSettings;
    /** Secret dédié aux jetons CSRF (dérivé du secret principal). */
    csrfSecret: string;
  };
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
  const authMiddlewares = createAuthMiddlewares({
    service: options.authService,
    cookieName: options.session.cookie.name,
    csrfSecret: options.session.csrfSecret,
    clientOrigin: options.clientOrigin,
  });

  const apiLimiter = createRateLimiter(limits.api, 'Trop de requêtes. Réessayez dans quelques minutes.');
  const contactLimiter = createRateLimiter(limits.contact, 'Trop de messages envoyés. Réessayez plus tard.');
  const authLimiter = createRateLimiter(limits.auth, 'Trop de requêtes. Réessayez dans quelques minutes.');
  const loginLimiter = createRateLimiter(
    limits.login,
    'Trop de tentatives de connexion. Réessayez dans quelques minutes.',
  );

  app.use('/api/health', createHealthRouter(options.deps.ping, options.logger));
  app.use('/api/public', apiLimiter, createPublicRouter(contentService));
  app.use('/api/contact', createContactRouter(contactService, contactLimiter));
  app.use(
    '/api/auth',
    createAuthRouter({
      service: options.authService,
      middlewares: authMiddlewares,
      cookie: options.session.cookie,
      csrfSecret: options.session.csrfSecret,
      ipHashSecret: options.ipHashSecret,
      limiter: authLimiter,
      loginLimiter,
    }),
  );
  app.use('/api/admin', apiLimiter, createAdminRouter(authMiddlewares));

  app.use(notFoundHandler);
  app.use(createErrorHandler(options.logger));

  return app;
}
