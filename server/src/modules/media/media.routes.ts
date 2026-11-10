import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../http/async-handler.js';
import { HttpError } from '../../http/errors.js';
import { sendFile } from '../../http/send-file.js';
import { parseOrThrow } from '../../http/validation.js';
import { requireUser } from '../auth/auth.middleware.js';
import type { AuditRepository } from '../audit/audit.repository.js';
import { toMediaDto, type MediaService } from './media.service.js';

const idParams = z.object({ id: z.string().regex(/^[1-9]\d{0,14}$/, 'Identifiant invalide.').transform(Number) });
const listQuery = z.object({ kind: z.enum(['all', 'image', 'document']).default('all') });
const altText = z.string().trim().max(255, 'Texte alternatif : 255 caractères maximum.');
const uploadFields = z.object({
  visibility: z.enum(['public', 'private']).optional(),
  altText: altText.optional(),
});
const patchBody = z
  .object({ altText: altText.nullable().optional(), visibility: z.enum(['public', 'private']).optional() })
  .strict()
  .refine((value) => value.altText !== undefined || value.visibility !== undefined, 'Aucune modification demandée.');

export function createMediaAdminRouter(options: {
  service: MediaService;
  audit: AuditRepository;
  upload: RequestHandler;
}): Router {
  const { service, audit } = options;
  const router = Router();

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const { kind } = parseOrThrow(listQuery, req.query);
      res.json({ data: await service.list(kind) });
    }),
  );

  router.post(
    '/',
    options.upload,
    asyncHandler(async (req, res) => {
      const user = requireUser(res);
      const fields = parseOrThrow(uploadFields, { ...(req.body as object | undefined) });
      const record = await service.upload({
        data: req.file?.buffer,
        originalName: req.file?.originalname ?? '',
        visibility: fields.visibility,
        altText: fields.altText,
        userId: user.id,
      });
      await audit.log({ userId: user.id, action: 'media.upload', entityType: 'media', entityId: record.id });
      res.status(201).json({ data: toMediaDto(record) });
    }),
  );

  router.get(
    '/:id/file',
    asyncHandler(async (req, res) => {
      const { id } = parseOrThrow(idParams, req.params);
      const { record, stream } = await service.getFile(id);
      await sendFile(req, res, {
        stream,
        mimeType: record.mimeType,
        sizeBytes: record.sizeBytes,
        sha256: record.sha256,
        disposition: 'inline',
        filename: record.originalName,
        cacheControl: 'private, no-cache',
      });
    }),
  );

  router.patch(
    '/:id',
    asyncHandler(async (req, res) => {
      const user = requireUser(res);
      const { id } = parseOrThrow(idParams, req.params);
      if (!req.is('application/json')) {
        throw new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Le contenu doit être envoyé au format JSON.');
      }
      const patch = parseOrThrow(patchBody, req.body);
      const record = await service.update(id, patch);
      await audit.log({ userId: user.id, action: 'media.update', entityType: 'media', entityId: id });
      res.json({ data: toMediaDto(record) });
    }),
  );

  router.put(
    '/:id/file',
    options.upload,
    asyncHandler(async (req, res) => {
      const user = requireUser(res);
      const { id } = parseOrThrow(idParams, req.params);
      const record = await service.replace({
        id,
        data: req.file?.buffer,
        originalName: req.file?.originalname ?? '',
      });
      await audit.log({ userId: user.id, action: 'media.replace', entityType: 'media', entityId: id });
      res.json({ data: toMediaDto(record) });
    }),
  );

  router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      const user = requireUser(res);
      const { id } = parseOrThrow(idParams, req.params);
      await service.remove(id);
      await audit.log({ userId: user.id, action: 'media.delete', entityType: 'media', entityId: id });
      res.json({ data: { deleted: true } });
    }),
  );

  return router;
}
