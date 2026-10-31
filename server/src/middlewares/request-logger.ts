import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';
import type { Logger } from 'pino';

/**
 * Journalise chaque requête (méthode, chemin, statut, durée) et attribue un identifiant de requête.
 * Ne journalise jamais le corps, les cookies, ni les paramètres d'URL (req.path n'inclut pas la requête).
 */
export function requestLogger(logger: Logger): RequestHandler {
  return (req, res, next) => {
    const requestId = randomUUID();
    res.locals['requestId'] = requestId;
    res.setHeader('X-Request-Id', requestId);
    const start = process.hrtime.bigint();

    res.on('finish', () => {
      const durationMs = Math.round(Number(process.hrtime.bigint() - start) / 1e6);
      logger.info(
        { requestId, method: req.method, path: req.path, status: res.statusCode, durationMs },
        'requête',
      );
    });
    next();
  };
}
