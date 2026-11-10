export type CvStatus = 'draft' | 'published' | 'archived';

export interface CvVersion {
  id: number;
  status: CvStatus;
  mediaId: number;
  storageKey: string;
  originalName: string;
  sizeBytes: number;
  sha256: string;
  createdAt: string;
  publishedAt: string | null;
}

export interface NewCvFile {
  storageKey: string;
  originalName: string;
  sizeBytes: number;
  sha256: string;
}

export type PublishResult = 'published' | 'not_found';
export type DeleteResult =
  | { result: 'deleted'; storageKey: string }
  | { result: 'not_found' }
  | { result: 'is_published' };

/**
 * Versions du CV. Cycle de vie : brouillon (importé, non publié) → publié → archivé.
 * La base garantit qu'il n'y a jamais deux CV publiés en même temps.
 */
export interface CvRepository {
  /** Toutes les versions, de la plus récente à la plus ancienne. */
  list(): Promise<CvVersion[]>;
  findById(id: number): Promise<CvVersion | null>;
  findPublished(): Promise<CvVersion | null>;
  /**
   * Enregistre un nouveau brouillon. L'éventuel brouillon précédent est supprimé dans la même transaction.
   * Renvoie les clés de stockage des fichiers remplacés, à supprimer ensuite. Le CV publié n'est JAMAIS touché.
   */
  createDraft(input: { file: NewCvFile; uploadedBy: number | null }): Promise<{ versionId: number; replacedKeys: string[] }>;
  /** Publie une version (brouillon ou archivée) et archive l'ancienne, dans une transaction. */
  publish(id: number): Promise<PublishResult>;
  /** Masque le CV public. Renvoie false s'il n'y en avait pas. */
  unpublish(): Promise<boolean>;
  /** Supprime un brouillon ou une version archivée (jamais la version publiée). */
  deleteVersion(id: number): Promise<DeleteResult>;
}
