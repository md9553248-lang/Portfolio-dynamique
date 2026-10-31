import type { RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';

export interface RateLimitSettings {
  windowMs: number;
  limit: number;
}

/**
 * Limite le nombre de requêtes par adresse IP. Les compteurs sont gardés en mémoire :
 * adapté à un seul processus (à revoir si le site tourne sur plusieurs serveurs).
 */
export function createRateLimiter(settings: RateLimitSettings, message: string): RequestHandler {
  return rateLimit({
    windowMs: settings.windowMs,
    limit: settings.limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, res) => {
      res.setHeader('Retry-After', String(Math.ceil(settings.windowMs / 1000)));
      res.status(429).json({ error: { code: 'TOO_MANY_REQUESTS', message } });
    },
  });
}
