export interface AuditEntry {
  userId: number | null;
  action: string;
  entityType?: string;
  entityId?: number;
  ipHash?: string | null;
  /** Jamais de mot de passe, de jeton ni de donnée personnelle. */
  details?: Record<string, string | number | boolean>;
}

/** Journal des actions d'administration. */
export interface AuditRepository {
  log(entry: AuditEntry): Promise<void>;
}
