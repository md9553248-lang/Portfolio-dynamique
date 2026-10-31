import type { RequestHandler } from 'express';
import { HttpError } from '../http/errors.js';

/**
 * Exige un corps JSON. Un formulaire HTML classique (envoyé depuis un autre site) n'utilise pas ce
 * type de contenu : cela complète la protection de CORS contre les envois non voulus.
 */
export const requireJson: RequestHandler = (req, _res, next) => {
  if (!req.is('application/json')) {
    next(
      new HttpError(
        415,
        'UNSUPPORTED_MEDIA_TYPE',
        'Le contenu doit être envoyé au format JSON (Content-Type: application/json).',
      ),
    );
    return;
  }
  next();
};
