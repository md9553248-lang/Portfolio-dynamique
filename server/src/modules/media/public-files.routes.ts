import { Router, type RequestHandler } from 'express';
import { asyncHandler } from '../../http/async-handler.js';
import { sendFile } from '../../http/send-file.js';
import type { CvService } from '../cv/cv.service.js';
import type { MediaService } from './media.service.js';

/**
 * Fichiers servis aux visiteurs. Rien n'est servi directement depuis le disque : chaque accès passe par la base.
 * - Une image publique : cache long (« immutable »), car son adresse change quand le fichier est remplacé.
 * - Le CV publié : jamais mis en cache sans revalidation, pour que la nouvelle version soit vue tout de suite.
 */
export function createPublicFilesRouter(options: {
  media: MediaService;
  cv: CvService;
  limiter: RequestHandler;
}): Router {
  const router = Router();

  router.get(
    '/media/:key',
    options.limiter,
    asyncHandler(async (req, res) => {
      const { record, stream } = await options.media.getPublicFile(String(req.params['key']));
      const isImage = record.mimeType.startsWith('image/');
      await sendFile(req, res, {
        stream,
        mimeType: record.mimeType,
        sizeBytes: record.sizeBytes,
        sha256: record.sha256,
        disposition: isImage ? 'inline' : 'attachment',
        filename: record.originalName,
        cacheControl: 'public, max-age=31536000, immutable',
      });
    }),
  );

  router.get(
    '/cv/download',
    options.limiter,
    asyncHandler(async (req, res) => {
      const { version, stream, downloadName } = await options.cv.getPublishedFile();
      await sendFile(req, res, {
        stream,
        mimeType: 'application/pdf',
        sizeBytes: version.sizeBytes,
        sha256: version.sha256,
        disposition: 'attachment',
        filename: downloadName,
        cacheControl: 'no-cache',
      });
    }),
  );

  return router;
}
