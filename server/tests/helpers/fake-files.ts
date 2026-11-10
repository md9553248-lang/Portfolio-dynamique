import type { CvRepository, CvVersion, DeleteResult, NewCvFile, PublishResult } from '../../src/modules/cv/cv.repository.js';
import type { DashboardRepository } from '../../src/modules/dashboard/dashboard.repository.js';
import type {
  MediaKindFilter,
  MediaRecord,
  MediaRepository,
  MediaUsage,
  NewMedia,
} from '../../src/modules/media/media.repository.js';
import type { AuditEntry, AuditRepository } from '../../src/modules/audit/audit.repository.js';

/**
 * Dépôts en mémoire pour les médias et le CV. Ils imitent les règles de la base (un seul CV publié,
 * le brouillon précédent remplacé, médias de CV exclus de la médiathèque) et permettent de simuler des pannes.
 */
export function createFakeFileRepositories() {
  const media = new Map<number, MediaRecord>();
  const cvMediaIds = new Set<number>();
  const usages = new Map<number, MediaUsage[]>();
  const versions: Array<{ id: number; status: CvVersion['status']; mediaId: number; createdAt: string; publishedAt: string | null }> = [];
  const audit: AuditEntry[] = [];
  let nextMediaId = 1;
  let nextVersionId = 1;
  const failures = { insertMedia: false, createDraft: false, replaceFile: false };

  const addMedia = (item: NewMedia): number => {
    const id = nextMediaId++;
    media.set(id, {
      id,
      storageKey: item.storageKey,
      originalName: item.originalName,
      mimeType: item.mimeType,
      sizeBytes: item.sizeBytes,
      sha256: item.sha256,
      visibility: item.visibility,
      altText: item.altText,
      createdAt: '2026-10-31T10:00:00Z',
    });
    return id;
  };

  const toVersion = (entry: (typeof versions)[number]): CvVersion => {
    const file = media.get(entry.mediaId);
    return {
      id: entry.id,
      status: entry.status,
      mediaId: entry.mediaId,
      storageKey: file?.storageKey ?? '',
      originalName: file?.originalName ?? '',
      sizeBytes: file?.sizeBytes ?? 0,
      sha256: file?.sha256 ?? '',
      createdAt: entry.createdAt,
      publishedAt: entry.publishedAt,
    };
  };

  const mediaRepo: MediaRepository = {
    insert: async (item) => {
      if (failures.insertMedia) throw new Error('Panne simulée de la base de données');
      return addMedia(item);
    },
    list: async (kind: MediaKindFilter) =>
      [...media.values()]
        .filter((item) => !cvMediaIds.has(item.id))
        .filter((item) => kind === 'all' || (kind === 'image') === item.mimeType.startsWith('image/'))
        .sort((a, b) => b.id - a.id),
    findById: async (id) => media.get(id) ?? null,
    findPublicByKey: async (key) =>
      [...media.values()].find((item) => item.storageKey === key && item.visibility === 'public' && !cvMediaIds.has(item.id)) ?? null,
    update: async (id, patch) => {
      const item = media.get(id);
      if (!item) return false;
      item.altText = patch.altText;
      item.visibility = patch.visibility;
      return true;
    },
    replaceFile: async (id, file) => {
      if (failures.replaceFile) throw new Error('Panne simulée de la base de données');
      const item = media.get(id);
      if (!item) return false;
      Object.assign(item, file);
      return true;
    },
    findUsages: async (id) => usages.get(id) ?? [],
    delete: async (id) => {
      media.delete(id);
    },
  };

  const cvRepo: CvRepository = {
    list: async () => [...versions].sort((a, b) => b.id - a.id).map(toVersion),
    findById: async (id) => {
      const entry = versions.find((candidate) => candidate.id === id);
      return entry ? toVersion(entry) : null;
    },
    findPublished: async () => {
      const entry = versions.find((candidate) => candidate.status === 'published');
      return entry ? toVersion(entry) : null;
    },
    createDraft: async ({ file, uploadedBy }: { file: NewCvFile; uploadedBy: number | null }) => {
      if (failures.createDraft) throw new Error('Panne simulée de la base de données');
      const replacedKeys: string[] = [];
      for (let index = versions.length - 1; index >= 0; index--) {
        const entry = versions[index];
        if (entry?.status === 'draft') {
          const old = media.get(entry.mediaId);
          if (old) replacedKeys.push(old.storageKey);
          media.delete(entry.mediaId);
          cvMediaIds.delete(entry.mediaId);
          versions.splice(index, 1);
        }
      }
      const mediaId = addMedia({
        storageKey: file.storageKey,
        originalName: file.originalName,
        mimeType: 'application/pdf',
        sizeBytes: file.sizeBytes,
        sha256: file.sha256,
        visibility: 'private',
        altText: null,
        uploadedBy,
      });
      cvMediaIds.add(mediaId);
      const id = nextVersionId++;
      versions.push({ id, status: 'draft', mediaId, createdAt: '2026-10-31T10:00:00Z', publishedAt: null });
      return { versionId: id, replacedKeys };
    },
    publish: async (id): Promise<PublishResult> => {
      const entry = versions.find((candidate) => candidate.id === id);
      if (!entry) return 'not_found';
      if (entry.status === 'published') return 'published';
      for (const other of versions) if (other.status === 'published') other.status = 'archived';
      entry.status = 'published';
      entry.publishedAt = '2026-10-31T12:00:00Z';
      return 'published';
    },
    unpublish: async () => {
      const entry = versions.find((candidate) => candidate.status === 'published');
      if (!entry) return false;
      entry.status = 'archived';
      return true;
    },
    deleteVersion: async (id): Promise<DeleteResult> => {
      const index = versions.findIndex((candidate) => candidate.id === id);
      const entry = versions[index];
      if (!entry) return { result: 'not_found' };
      if (entry.status === 'published') return { result: 'is_published' };
      const file = media.get(entry.mediaId);
      media.delete(entry.mediaId);
      cvMediaIds.delete(entry.mediaId);
      versions.splice(index, 1);
      return { result: 'deleted', storageKey: file?.storageKey ?? '' };
    },
  };

  const dashboard: DashboardRepository = {
    getStats: async () => ({
      projects: { published: 3, draft: 1 },
      articles: { published: 2, draft: 1 },
      messages: { total: 5, unread: 2 },
      media: { total: media.size },
      cv: { publishedAt: versions.find((entry) => entry.status === 'published')?.publishedAt ?? null },
      security: { failedLogins24h: 4 },
    }),
    getRecentActivity: async () => [
      { action: 'cv.publish', entityType: 'cv', createdAt: '2026-10-31T12:00:00Z', actor: 'Administrateur Test' },
    ],
  };

  const auditRepo: AuditRepository = {
    log: async (entry) => {
      audit.push(entry);
    },
  };

  return { mediaRepo, cvRepo, dashboard, auditRepo, media, versions, usages, audit, failures };
}

export type FakeFiles = ReturnType<typeof createFakeFileRepositories>;
