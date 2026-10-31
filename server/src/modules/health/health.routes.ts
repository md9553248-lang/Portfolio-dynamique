import { Router } from 'express';
import type { Logger } from 'pino';

/**
 * - GET /api/health       : le serveur répond (sans toucher à la base).
 * - GET /api/health/ready : le serveur ET la base de données répondent.
 * Aucune information interne n'est exposée.
 */
export function createHealthRouter(ping: () => Promise<void>, logger: Logger): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    res.json({ status: 'ok' });
  });

  router.get('/ready', (_req, res) => {
    ping().then(
      () => {
        res.json({ status: 'ready' });
      },
      (error: unknown) => {
        logger.error({ code: (error as { code?: string }).code }, 'Base de données indisponible');
        res.status(503).json({ status: 'unavailable' });
      },
    );
  });

  return router;
}
