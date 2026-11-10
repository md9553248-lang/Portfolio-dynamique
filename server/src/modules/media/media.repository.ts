export type MediaVisibility = 'public' | 'private';

export interface MediaRecord {
  id: number;
  storageKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  visibility: MediaVisibility;
  altText: string | null;
  createdAt: string;
}

export interface MediaUsage {
  /** Où le fichier est utilisé (ex. « Projet », « Photo du profil »). */
  where: string;
  label: string;
}

export interface NewMedia {
  storageKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  visibility: MediaVisibility;
  altText: string | null;
  uploadedBy: number | null;
}

export type MediaKindFilter = 'all' | 'image' | 'document';

export interface MediaRepository {
  insert(media: NewMedia): Promise<number>;
  /** La médiathèque : les fichiers des versions de CV n'y apparaissent pas (page « CV » dédiée). */
  list(kind: MediaKindFilter): Promise<MediaRecord[]>;
  findById(id: number): Promise<MediaRecord | null>;
  findPublicByKey(storageKey: string): Promise<MediaRecord | null>;
  update(id: number, patch: { altText: string | null; visibility: MediaVisibility }): Promise<boolean>;
  replaceFile(
    id: number,
    file: Pick<MediaRecord, 'storageKey' | 'originalName' | 'mimeType' | 'sizeBytes' | 'sha256'>,
  ): Promise<boolean>;
  findUsages(id: number): Promise<MediaUsage[]>;
  delete(id: number): Promise<void>;
}
