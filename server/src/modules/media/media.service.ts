import { createHash, randomUUID } from 'node:crypto';
import type { Readable } from 'node:stream';
import type { Logger } from 'pino';
import { HttpError, NotFoundError } from '../../http/errors.js';
import { isValidStorageKey, type StorageAdapter } from '../../storage/storage.js';
import {
  detectFileType,
  findActivePdfContent,
  isImageKind,
  sanitizeOriginalName,
  type DetectedFile,
} from '../../utils/file-types.js';
import type { MediaRecord, MediaRepository, MediaVisibility } from './media.repository.js';

export const ALLOWED_MEDIA_LABEL = 'PDF, JPEG, PNG, WebP ou AVIF';

export interface MediaDto {
  id: number;
  url: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  visibility: MediaVisibility;
  altText: string | null;
  kind: 'image' | 'document';
  createdAt: string;
}

/** Représentation envoyée à l'interface : ni clé de stockage des fichiers privés, ni empreinte. */
export function toMediaDto(record: MediaRecord): MediaDto {
  return {
    id: record.id,
    url:
      record.visibility === 'public'
        ? `/api/public/media/${record.storageKey}`
        : `/api/admin/media/${record.id}/file`,
    originalName: record.originalName,
    mimeType: record.mimeType,
    sizeBytes: record.sizeBytes,
    visibility: record.visibility,
    altText: record.altText,
    kind: record.mimeType.startsWith('image/') ? 'image' : 'document',
    createdAt: record.createdAt,
  };
}

export interface MediaServiceOptions {
  repo: MediaRepository;
  storage: StorageAdapter;
  maxBytes: number;
  logger: Logger;
}

export function createMediaService(options: MediaServiceOptions) {
  const { repo, storage } = options;

  /** Contrôle le contenu réel du fichier. Refuse tout ce qui n'est pas un PDF ou une image courante. */
  function inspect(data: Buffer | undefined): { data: Buffer; detected: DetectedFile } {
    if (!data || data.length === 0) {
      throw new HttpError(400, 'MISSING_FILE', 'Aucun fichier reçu (ou fichier vide).');
    }
    if (data.length > options.maxBytes) {
      throw new HttpError(413, 'FILE_TOO_LARGE', 'Le fichier dépasse la taille maximale autorisée.');
    }
    const detected = detectFileType(data);
    if (!detected) {
      throw new HttpError(
        400,
        'INVALID_FILE_TYPE',
        `Type de fichier non autorisé. Formats acceptés : ${ALLOWED_MEDIA_LABEL}.`,
      );
    }
    if (detected.kind === 'pdf' && findActivePdfContent(data)) {
      throw new HttpError(
        400,
        'UNSAFE_PDF',
        'Ce PDF contient des éléments actifs (JavaScript, fichiers joints...) : il est refusé par sécurité.',
      );
    }
    return { data, detected };
  }

  const sha256 = (data: Buffer) => createHash('sha256').update(data).digest('hex');

  /** Supprime un fichier du stockage sans jamais faire échouer l'opération principale. */
  const removeQuietly = async (key: string) => {
    try {
      await storage.delete(key);
    } catch (error) {
      options.logger.error({ code: (error as { code?: string }).code }, 'Suppression de fichier impossible');
    }
  };

  async function mustFind(id: number): Promise<MediaRecord> {
    const record = await repo.findById(id);
    if (!record) throw new NotFoundError('Fichier introuvable.');
    return record;
  }

  async function openOrNotFound(key: string): Promise<Readable> {
    try {
      return await storage.read(key);
    } catch {
      throw new NotFoundError('Fichier introuvable.');
    }
  }

  return {
    async list(kind: 'all' | 'image' | 'document') {
      return (await repo.list(kind)).map(toMediaDto);
    },

    async upload(input: {
      data: Buffer | undefined;
      originalName: string;
      visibility?: MediaVisibility | undefined;
      altText?: string | undefined;
      userId: number;
    }): Promise<MediaRecord> {
      const { data, detected } = inspect(input.data);
      const storageKey = randomUUID();

      // 1. Le fichier est écrit sur le stockage. 2. La base est mise à jour. Si la base échoue, on retire le fichier.
      await storage.save(storageKey, data);
      try {
        const id = await repo.insert({
          storageKey,
          originalName: sanitizeOriginalName(input.originalName),
          mimeType: detected.mime,
          sizeBytes: data.length,
          sha256: sha256(data),
          visibility: input.visibility ?? (isImageKind(detected.kind) ? 'public' : 'private'),
          altText: input.altText?.trim() ? input.altText.trim() : null,
          uploadedBy: input.userId,
        });
        return await mustFind(id);
      } catch (error) {
        await removeQuietly(storageKey);
        throw error;
      }
    },

    async update(id: number, patch: { altText?: string | null; visibility?: MediaVisibility }): Promise<MediaRecord> {
      const current = await mustFind(id);
      const altText = patch.altText === undefined ? current.altText : patch.altText?.trim() || null;
      await repo.update(id, { altText, visibility: patch.visibility ?? current.visibility });
      return mustFind(id);
    },

    /** Remplace le contenu d'un fichier en gardant son identifiant : les références (projets, profil...) restent valides. */
    async replace(input: { id: number; data: Buffer | undefined; originalName: string }): Promise<MediaRecord> {
      const current = await mustFind(input.id);
      const { data, detected } = inspect(input.data);
      if (current.mimeType.startsWith('image/') !== isImageKind(detected.kind)) {
        throw new HttpError(400, 'INVALID_FILE_TYPE', 'Le nouveau fichier doit être du même genre (image ou PDF).');
      }

      // Nouvelle clé : l'adresse du fichier change, les anciennes copies en cache ne peuvent donc pas persister.
      const storageKey = randomUUID();
      await storage.save(storageKey, data);
      try {
        await repo.replaceFile(input.id, {
          storageKey,
          originalName: sanitizeOriginalName(input.originalName),
          mimeType: detected.mime,
          sizeBytes: data.length,
          sha256: sha256(data),
        });
      } catch (error) {
        await removeQuietly(storageKey);
        throw error;
      }
      await removeQuietly(current.storageKey);
      return mustFind(input.id);
    },

    async remove(id: number): Promise<void> {
      const current = await mustFind(id);
      const usages = await repo.findUsages(id);
      if (usages.length > 0) {
        throw new HttpError(
          409,
          'MEDIA_IN_USE',
          'Ce fichier est encore utilisé : retirez-le d’abord des contenus qui l’utilisent.',
          undefined,
          undefined,
          { usages },
        );
      }
      await repo.delete(id);
      await removeQuietly(current.storageKey);
    },

    /** Fichier pour l'administration (aperçu de n'importe quel fichier, y compris privé). */
    async getFile(id: number): Promise<{ record: MediaRecord; stream: Readable }> {
      const record = await mustFind(id);
      return { record, stream: await openOrNotFound(record.storageKey) };
    },

    /** Fichier pour les visiteurs : uniquement s'il est public. Une adresse inconnue ou privée donne toujours 404. */
    async getPublicFile(key: string): Promise<{ record: MediaRecord; stream: Readable }> {
      if (!isValidStorageKey(key)) throw new NotFoundError('Fichier introuvable.');
      const record = await repo.findPublicByKey(key);
      if (!record) throw new NotFoundError('Fichier introuvable.');
      return { record, stream: await openOrNotFound(key) };
    },
  };
}

export type MediaService = ReturnType<typeof createMediaService>;
