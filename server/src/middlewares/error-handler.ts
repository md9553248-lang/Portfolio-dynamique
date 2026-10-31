import type { ErrorRequestHandler } from 'express';
import type { Logger } from 'pino';
import { HttpError } from '../http/errors.js';

/** Retourne le statut 4xx porté par certaines erreurs (ex. JSON invalide, corps trop gros). */
function getClientErrorStatus(err: unknown): number | undefined {
  if (typeof err === 'object' && err !== null && 'status' in err) {
    const status = (err as { status: unknown }).status;
    if (typeof status === 'number' && status >= 400 && status < 500) return status;
  }
  return undefined;
}

/**
 * Gestionnaire d'erreurs centralisé.
 * Ne renvoie jamais de trace interne au client ; les détails vont uniquement dans les journaux.
 */
export function createErrorHandler(logger: Logger): ErrorRequestHandler {
  return (err, req, res, next) => {
    if (res.headersSent) {
      next(err);
      return;
    }

    if (err instanceof HttpError) {
      res.status(err.status).json({
        error: {
          code: err.code,
          message: err.message,
          ...(err.fields ? { fields: err.fields } : {}),
        },
      });
      return;
    }

    const clientStatus = getClientErrorStatus(err);
    if (clientStatus !== undefined) {
      const tooLarge = clientStatus === 413;
      res.status(clientStatus).json({
        error: {
          code: tooLarge ? 'PAYLOAD_TOO_LARGE' : 'BAD_REQUEST',
          message: tooLarge ? 'Requête trop volumineuse.' : 'Requête invalide.',
        },
      });
      return;
    }

    logger.error({ err, requestId: res.locals['requestId'], path: req.path }, 'Erreur non gérée');
    res
      .status(500)
      .json({ error: { code: 'INTERNAL_ERROR', message: 'Une erreur interne est survenue.' } });
  };
}
