import { Router, type RequestHandler } from 'express';
import { asyncHandler } from '../../http/async-handler.js';
import { parseOrThrow } from '../../http/validation.js';
import { requireJson } from '../../middlewares/require-json.js';
import { contactSchema } from './contact.schema.js';
import type { ContactService } from './contact.service.js';

export function createContactRouter(service: ContactService, limiter: RequestHandler): Router {
  const router = Router();

  // Ordre voulu : limitation de débit, type de contenu, validation, enregistrement.
  router.post(
    '/',
    limiter,
    requireJson,
    asyncHandler(async (req, res) => {
      const input = parseOrThrow(contactSchema, req.body);
      await service.submit(input, { ip: req.ip ?? '' });
      // Réponse volontairement minimale : on ne renvoie jamais les données reçues.
      res
        .status(201)
        .setHeader('Cache-Control', 'no-store')
        .json({ data: { received: true } });
    }),
  );

  return router;
}
