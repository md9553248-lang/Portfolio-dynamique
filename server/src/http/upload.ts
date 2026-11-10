import type { RequestHandler } from 'express';
import multer from 'multer';
import { HttpError } from './errors.js';

/**
 * Réception d'UN fichier (champ « file ») dans la mémoire, avec une taille maximale.
 * Le type réel du fichier est vérifié ensuite par le service (signature des octets).
 */
export function createFileUpload(maxBytes: number): RequestHandler {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxBytes, files: 1, fields: 10, fieldSize: 10_000, parts: 12 },
  }).single('file');

  const maxMegabytes = Math.floor((maxBytes / (1024 * 1024)) * 10) / 10;

  return (req, res, next) => {
    upload(req, res, (error: unknown) => {
      if (!error) {
        next();
        return;
      }
      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          next(
            new HttpError(
              413,
              'FILE_TOO_LARGE',
              `Le fichier dépasse la taille maximale autorisée (${maxMegabytes} Mo).`,
            ),
          );
          return;
        }
        next(
          new HttpError(
            400,
            'INVALID_UPLOAD',
            'Envoi invalide : un seul fichier est attendu, dans le champ « file ».',
          ),
        );
        return;
      }
      next(error);
    });
  };
}
