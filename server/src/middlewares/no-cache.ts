import type { RequestHandler } from 'express';

/** L'API demande toujours une revalidation : un contenu modifié dans l'administration apparaît tout de suite. */
export const noCache: RequestHandler = (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache');
  next();
};
