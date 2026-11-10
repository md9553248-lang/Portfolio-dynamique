import { createHash, randomUUID } from 'node:crypto';
import type { Readable } from 'node:stream';
import type { Logger } from 'pino';
import { HttpError, NotFoundError } from '../../http/errors.js';
import type { StorageAdapter } from '../../storage/storage.js';
import {
  cvDownloadName,
  detectFileType,
  findActivePdfContent,
  sanitizeOriginalName,
} from '../../utils/file-types.js';
import type { CvRepository, CvVersion } from './cv.repository.js';

export interface CvDto {
  id: number;
  status: CvVersion['status'];
  originalName: string;
  sizeBytes: number;
  createdAt: string;
  publishedAt: string | null;
  /** Adresse d'aperçu et de téléchargement, réservée aux administrateurs connectés. */
  fileUrl: string;
}

export function toCvDto(version: CvVersion): CvDto {
  return {
    id: version.id,
    status: version.status,
    originalName: version.originalName,
    sizeBytes: version.sizeBytes,
    createdAt: version.createdAt,
    publishedAt: version.publishedAt,
    fileUrl: `/api/admin/cv/${version.id}/file`,
  };
}

export interface CvServiceOptions {
  repo: CvRepository;
  storage: StorageAdapter;
  maxBytes: number;
  logger: Logger;
  /** Nom affiché du propriétaire, pour nommer le fichier téléchargé (« CV-Prenom-Nom.pdf »). */
  getDisplayName: () => Promise<string | null>;
}

export function createCvService(options: CvServiceOptions) {
  const { repo, storage } = options;

  const removeQuietly = async (key: string) => {
    try {
      await storage.delete(key);
    } catch (error) {
      options.logger.error({ code: (error as { code?: string }).code }, 'Suppression de fichier impossible');
    }
  };

  async function open(version: CvVersion): Promise<{ version: CvVersion; stream: Readable }> {
    try {
      return { version, stream: await storage.read(version.storageKey) };
    } catch {
      throw new NotFoundError('Fichier du CV introuvable.');
    }
  }

  async function mustFind(id: number): Promise<CvVersion> {
    const version = await repo.findById(id);
    if (!version) throw new NotFoundError('Version de CV introuvable.');
    return version;
  }

  return {
    /** Versions regroupées pour l'interface : publiée, brouillon, archivées. */
    async overview() {
      const versions = await repo.list();
      return {
        current: versions.find((version) => version.status === 'published') ?? null,
        draft: versions.find((version) => version.status === 'draft') ?? null,
        archived: versions.filter((version) => version.status === 'archived'),
      };
    },

    /**
     * Importe un nouveau CV comme BROUILLON. Le CV publié n'est jamais modifié ici : si quoi que ce soit échoue
     * (type de fichier, taille, stockage, base de données), le CV actuellement en ligne reste exactement le même.
     */
    async uploadDraft(input: { data: Buffer | undefined; originalName: string; userId: number }): Promise<CvVersion> {
      const { data } = input;
      if (!data || data.length === 0) {
        throw new HttpError(400, 'MISSING_FILE', 'Aucun fichier reçu (ou fichier vide).');
      }
      if (data.length > options.maxBytes) {
        throw new HttpError(413, 'FILE_TOO_LARGE', 'Le fichier dépasse la taille maximale autorisée.');
      }
      if (detectFileType(data)?.kind !== 'pdf') {
        throw new HttpError(400, 'INVALID_FILE_TYPE', 'Le CV doit être un fichier PDF valide.');
      }
      if (findActivePdfContent(data)) {
        throw new HttpError(
          400,
          'UNSAFE_PDF',
          'Ce PDF contient des éléments actifs (JavaScript, fichiers joints...) : il est refusé par sécurité.',
        );
      }

      const storageKey = randomUUID();
      await storage.save(storageKey, data);
      try {
        const { versionId, replacedKeys } = await repo.createDraft({
          file: {
            storageKey,
            originalName: sanitizeOriginalName(input.originalName),
            sizeBytes: data.length,
            sha256: createHash('sha256').update(data).digest('hex'),
          },
          uploadedBy: input.userId,
        });
        await Promise.all(replacedKeys.map(removeQuietly));
        return await mustFind(versionId);
      } catch (error) {
        await removeQuietly(storageKey);
        throw error;
      }
    },

    async publish(id: number): Promise<CvVersion> {
      const result = await repo.publish(id);
      if (result === 'not_found') throw new NotFoundError('Version de CV introuvable.');
      return mustFind(id);
    },

    async unpublish(): Promise<void> {
      if (!(await repo.unpublish())) {
        throw new HttpError(409, 'NO_PUBLISHED_CV', 'Aucun CV n’est publié actuellement.');
      }
    },

    async remove(id: number): Promise<void> {
      const result = await repo.deleteVersion(id);
      if (result.result === 'not_found') throw new NotFoundError('Version de CV introuvable.');
      if (result.result === 'is_published') {
        throw new HttpError(409, 'CV_PUBLISHED', 'Ce CV est publié : masquez-le avant de le supprimer.');
      }
      await removeQuietly(result.storageKey);
    },

    /** Fichier d'une version, pour l'administration (aperçu, téléchargement, ancienne version). */
    async getAdminFile(id: number) {
      return open(await mustFind(id));
    },

    /** Fichier du CV PUBLIÉ, pour les visiteurs. 404 s'il n'y en a aucun (CV masqué ou jamais publié). */
    async getPublishedFile() {
      const version = await repo.findPublished();
      if (!version) throw new NotFoundError('Aucun CV n’est disponible.');
      const { stream } = await open(version);
      return { version, stream, downloadName: cvDownloadName(await options.getDisplayName()) };
    },
  };
}

export type CvService = ReturnType<typeof createCvService>;
