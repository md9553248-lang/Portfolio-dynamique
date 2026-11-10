import { Router, type RequestHandler } from 'express';
import { getAuth, type AuthMiddlewares } from './auth.middleware.js';

/**
 * Socle des routes d'administration. TOUTE route ajoutée ici est automatiquement protégée par :
 * 1. une session valide (401 sinon, même pour une adresse qui n'existe pas : on ne révèle rien),
 * 2. le rôle administrateur (403 sinon),
 * 3. l'origine du site et le jeton CSRF pour toute requête qui modifie des données.
 */
export function createAdminRouter(
  mw: AuthMiddlewares,
  sections: Record<string, Router | RequestHandler> = {},
): Router {
  const router = Router();

  router.use(mw.attachUser, mw.requireAuth, mw.requireRole('admin'), mw.requireSameOrigin, mw.requireCsrf);

  // Vérification technique : confirme que l'accès administrateur fonctionne.
  router.get('/status', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({ data: { ok: true, user: getAuth(res)?.user } });
  });

  for (const [path, section] of Object.entries(sections)) {
    router.use(`/${path}`, section);
  }

  return router;
}
