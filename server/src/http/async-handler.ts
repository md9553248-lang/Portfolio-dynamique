import type { NextFunction, Request, RequestHandler, Response } from 'express';

/** Envoie toute erreur d'une fonction asynchrone au gestionnaire d'erreurs centralisé. */
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>,
): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}
