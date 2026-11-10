import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../http/async-handler.js';
import { sendFile } from '../../http/send-file.js';
import { parseOrThrow } from '../../http/validation.js';
import type { AuditRepository } from '../audit/audit.repository.js';
import { requireUser } from '../auth/auth.middleware.js';
import { toCvDto, type CvService } from './cv.service.js';

const idParams = z.object({ id: z.string().regex(/^[1-9]\d{0,14}$/, 'Identifiant invalide.').transform(Number) });
const fileQuery = z.object({ download: z.enum(['1']).optional() });

/** Gestion du CV (administrateur) : import, aperçu, publication, masquage, suppression. */
export function createCvAdminRouter(options: {
  service: CvService;
  audit: AuditRepository;
  upload: RequestHandler;
  maxBytes: number;
}): Router {
  const { service, audit } = options;
  const router = Router();

  router.get(
    '/',
    asyncHandler(async (_req, res) => {
      const { current, draft, archived } = await service.overview();
      res.setHeader('Cache-Control', 'no-store');
      res.json({
        data: {
          current: current ? toCvDto(current) : null,
          draft: draft ? toCvDto(draft) : null,
          archived: archived.map(toCvDto),
          maxSizeMb: Math.floor((options.maxBytes / (1024 * 1024)) * 10) / 10,
        },
      });
    }),
  );

  router.post(
    '/',
    options.upload,
    asyncHandler(async (req, res) => {
      const user = requireUser(res);
      const version = await service.uploadDraft({
        data: req.file?.buffer,
        originalName: req.file?.originalname ?? '',
        userId: user.id,
      });
      await audit.log({ userId: user.id, action: 'cv.upload', entityType: 'cv', entityId: version.id });
      res.status(201).json({ data: toCvDto(version) });
    }),
  );

  // Fixe, avant les routes « /:id/... »
  router.post(
    '/unpublish',
    asyncHandler(async (_req, res) => {
      const user = requireUser(res);
      await service.unpublish();
      await audit.log({ userId: user.id, action: 'cv.unpublish', entityType: 'cv' });
      res.json({ data: { published: false } });
    }),
  );

  router.get(
    '/:id/file',
    asyncHandler(async (req, res) => {
      const { id } = parseOrThrow(idParams, req.params);
      const { download } = parseOrThrow(fileQuery, req.query);
      const { version, stream } = await service.getAdminFile(id);
      await sendFile(req, res, {
        stream,
        mimeType: 'application/pdf',
        sizeBytes: version.sizeBytes,
        sha256: version.sha256,
        disposition: download ? 'attachment' : 'inline',
        filename: version.originalName.toLowerCase().endsWith('.pdf') ? version.originalName : `${version.originalName}.pdf`,
        cacheControl: 'private, no-cache',
      });
    }),
  );

  router.post(
    '/:id/publish',
    asyncHandler(async (req, res) => {
      const user = requireUser(res);
      const { id } = parseOrThrow(idParams, req.params);
      const version = await service.publish(id);
      await audit.log({ userId: user.id, action: 'cv.publish', entityType: 'cv', entityId: id });
      res.json({ data: toCvDto(version) });
    }),
  );

  router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      const user = requireUser(res);
      const { id } = parseOrThrow(idParams, req.params);
      await service.remove(id);
      await audit.log({ userId: user.id, action: 'cv.delete', entityType: 'cv', entityId: id });
      res.json({ data: { deleted: true } });
    }),
  );

  return router;
}
