import { Router } from 'express';

export const healthRouter = Router();

// Contrôle de santé minimal : n'expose aucune information interne.
healthRouter.get('/', (_req, res) => {
  res.json({ status: 'ok' });
});
