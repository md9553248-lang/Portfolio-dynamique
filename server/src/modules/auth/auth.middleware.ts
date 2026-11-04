import type { RequestHandler, Response } from 'express';
import { asyncHandler } from '../../http/async-handler.js';
import { HttpError } from '../../http/errors.js';
import type { PublicUser } from './auth.repository.js';
import type { AuthService } from './auth.service.js';
import { computeCsrfToken, verifyCsrfToken } from './csrf.js';
import { readSessionToken } from './session-cookie.js';

export interface AuthContext {
  user: PublicUser;
  tokenHash: string;
  /** Jeton brut de la session (jamais renvoyé au client, ni journalisé). */
  sessionToken: string;
  csrfToken: string;
}

export function getAuth(res: Response): AuthContext | undefined {
  return res.locals['auth'] as AuthContext | undefined;
}

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export interface AuthMiddlewareOptions {
  service: AuthService;
  cookieName: string;
  csrfSecret: string;
  /** Origine exacte du site (ex. https://monsite.com). */
  clientOrigin: string;
}

export function createAuthMiddlewares(options: AuthMiddlewareOptions) {
  /** Identifie l'utilisateur à partir du cookie de session, sans jamais refuser la requête. */
  const attachUser: RequestHandler = asyncHandler(async (req, res, next) => {
    const token = readSessionToken(req.headers.cookie, options.cookieName);
    if (token) {
      const result = await options.service.authenticate(token);
      if (result) {
        const context: AuthContext = {
          user: result.user,
          tokenHash: result.tokenHash,
          sessionToken: token,
          csrfToken: computeCsrfToken(options.csrfSecret, token),
        };
        res.locals['auth'] = context;
      }
    }
    next();
  });

  /** Refuse (401) toute requête sans session valide. */
  const requireAuth: RequestHandler = (_req, res, next) => {
    if (!getAuth(res)) {
      next(new HttpError(401, 'UNAUTHENTICATED', 'Authentification requise.'));
      return;
    }
    next();
  };

  /** Refuse (403) un utilisateur qui n'a pas le rôle demandé. */
  const requireRole =
    (role: string): RequestHandler =>
    (_req, res, next) => {
      if (getAuth(res)?.user.role !== role) {
        next(new HttpError(403, 'FORBIDDEN', 'Accès refusé.'));
        return;
      }
      next();
    };

  /** Pour les requêtes qui modifient des données : l'origine doit être celle du site. */
  const requireSameOrigin: RequestHandler = (req, _res, next) => {
    if (!UNSAFE_METHODS.has(req.method)) {
      next();
      return;
    }
    const origin = req.get('Origin');
    if (origin !== undefined && origin !== options.clientOrigin) {
      next(new HttpError(403, 'FORBIDDEN_ORIGIN', 'Origine de la requête refusée.'));
      return;
    }
    if (req.get('Sec-Fetch-Site') === 'cross-site') {
      next(new HttpError(403, 'FORBIDDEN_ORIGIN', 'Origine de la requête refusée.'));
      return;
    }
    next();
  };

  /** Pour les requêtes qui modifient des données : le jeton CSRF de la session est obligatoire. */
  const requireCsrf: RequestHandler = (req, res, next) => {
    if (!UNSAFE_METHODS.has(req.method)) {
      next();
      return;
    }
    const auth = getAuth(res);
    if (!auth || !verifyCsrfToken(options.csrfSecret, auth.sessionToken, req.get('X-CSRF-Token'))) {
      next(new HttpError(403, 'INVALID_CSRF_TOKEN', 'Jeton de sécurité invalide ou manquant.'));
      return;
    }
    next();
  };

  return { attachUser, requireAuth, requireRole, requireSameOrigin, requireCsrf };
}

export type AuthMiddlewares = ReturnType<typeof createAuthMiddlewares>;
