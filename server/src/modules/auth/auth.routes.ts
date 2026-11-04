import { Router, type RequestHandler, type Response } from 'express';
import { asyncHandler } from '../../http/async-handler.js';
import { HttpError } from '../../http/errors.js';
import { parseOrThrow } from '../../http/validation.js';
import { requireJson } from '../../middlewares/require-json.js';
import { hmacHash } from '../../utils/hash.js';
import { changePasswordSchema, loginSchema } from './auth.schemas.js';
import { getAuth, type AuthMiddlewares } from './auth.middleware.js';
import type { AuthService } from './auth.service.js';
import { computeCsrfToken, verifyCsrfToken } from './csrf.js';

export interface SessionCookieSettings {
  name: string;
  /** true en production (HTTPS). Le préfixe __Host- du nom l'exige. */
  secure: boolean;
}

export interface AuthRouterOptions {
  service: AuthService;
  middlewares: AuthMiddlewares;
  cookie: SessionCookieSettings;
  csrfSecret: string;
  ipHashSecret: string;
  /** Limite générale des routes d'authentification. */
  limiter: RequestHandler;
  /** Limite stricte sur la connexion. */
  loginLimiter: RequestHandler;
}

export function createAuthRouter(options: AuthRouterOptions): Router {
  const { service, middlewares: mw, cookie } = options;
  const router = Router();

  const cookieAttributes = {
    httpOnly: true, // illisible par JavaScript : un script injecté ne peut pas voler la session
    secure: cookie.secure,
    sameSite: 'strict' as const, // jamais envoyé depuis un autre site
    path: '/',
  };
  // Pas de durée (maxAge) : cookie de session, effacé à la fermeture du navigateur. La durée réelle est côté serveur.
  const setSessionCookie = (res: Response, token: string) => res.cookie(cookie.name, token, cookieAttributes);
  const clearSessionCookie = (res: Response) => res.clearCookie(cookie.name, cookieAttributes);

  router.use(options.limiter);
  router.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  router.use(mw.attachUser);

  router.post(
    '/login',
    options.loginLimiter,
    requireJson,
    mw.requireSameOrigin,
    asyncHandler(async (req, res) => {
      const input = parseOrThrow(loginSchema, req.body);
      const previous = getAuth(res);

      const { token, user } = await service.login(input, {
        ip: req.ip ?? '',
        userAgent: req.get('user-agent') ?? '',
      });

      // Nouvelle session à chaque connexion : l'ancienne (si elle existe) est fermée.
      if (previous) await service.logout(previous.tokenHash, null);
      setSessionCookie(res, token);
      res.json({ data: { user, csrfToken: computeCsrfToken(options.csrfSecret, token) } });
    }),
  );

  router.get('/me', mw.requireAuth, (_req, res) => {
    const auth = getAuth(res);
    res.json({ data: { user: auth?.user, csrfToken: auth?.csrfToken } });
  });

  router.post(
    '/logout',
    mw.requireSameOrigin,
    asyncHandler(async (req, res) => {
      const auth = getAuth(res);
      if (auth) {
        if (!verifyCsrfToken(options.csrfSecret, auth.sessionToken, req.get('X-CSRF-Token'))) {
          throw new HttpError(403, 'INVALID_CSRF_TOKEN', 'Jeton de sécurité invalide ou manquant.');
        }
        await service.logout(auth.tokenHash, auth.user.id, hmacHash(options.ipHashSecret, req.ip ?? ''));
      }
      // Idempotent : même sans session valide, on efface le cookie et on répond OK.
      clearSessionCookie(res);
      res.json({ data: { loggedOut: true } });
    }),
  );

  router.post(
    '/change-password',
    mw.requireAuth,
    mw.requireSameOrigin,
    mw.requireCsrf,
    requireJson,
    asyncHandler(async (req, res) => {
      const auth = getAuth(res);
      if (!auth) throw new HttpError(401, 'UNAUTHENTICATED', 'Authentification requise.');
      const input = parseOrThrow(changePasswordSchema, req.body);

      await service.changePassword({
        userId: auth.user.id,
        currentTokenHash: auth.tokenHash,
        currentPassword: input.currentPassword,
        newPassword: input.newPassword,
        ipHash: hmacHash(options.ipHashSecret, req.ip ?? ''),
      });
      res.json({ data: { changed: true } });
    }),
  );

  return router;
}
