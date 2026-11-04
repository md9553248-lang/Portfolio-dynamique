export interface PublicUser {
  id: number;
  email: string;
  displayName: string;
  role: string;
}

export interface UserRecord extends PublicUser {
  passwordHash: string;
  isActive: boolean;
}

export interface FailureStats {
  /** Échecs récents pour ce couple e-mail + adresse IP. */
  pair: { count: number; secondsSinceLast: number };
  /** Échecs récents pour cet e-mail, depuis n'importe quelle adresse. */
  identifier: { count: number; secondsSinceLast: number };
}

/**
 * Accès aux comptes, sessions et tentatives de connexion.
 * Toutes les durées sont calculées par MySQL en UTC (UTC_TIMESTAMP), jamais avec l'heure de l'application.
 */
export interface AuthRepository {
  countUsers(): Promise<number>;
  findUserByEmail(email: string): Promise<UserRecord | null>;
  findUserById(id: number): Promise<UserRecord | null>;
  createUser(input: { email: string; passwordHash: string; displayName: string }): Promise<number>;
  updatePasswordHash(userId: number, passwordHash: string): Promise<void>;
  touchLastLogin(userId: number): Promise<void>;

  createSession(input: {
    tokenHash: string;
    userId: number;
    ipHash: string;
    userAgent: string;
    absoluteSeconds: number;
  }): Promise<void>;
  /** Renvoie la session seulement si elle n'a expiré ni en durée absolue ni par inactivité, et si le compte est actif. */
  findActiveSession(
    tokenHash: string,
    idleSeconds: number,
  ): Promise<{ user: PublicUser; idleSeconds: number } | null>;
  touchSession(tokenHash: string): Promise<void>;
  deleteSession(tokenHash: string): Promise<void>;
  deleteSessionsForUser(userId: number, exceptTokenHash?: string): Promise<void>;
  deleteExpiredSessions(idleSeconds: number): Promise<void>;

  recordLoginAttempt(input: { identifierHash: string; ipHash: string; succeeded: boolean }): Promise<void>;
  clearFailedAttempts(input: { identifierHash: string; ipHash: string }): Promise<void>;
  getFailureStats(input: { identifierHash: string; ipHash: string }): Promise<FailureStats>;
  purgeOldLoginAttempts(): Promise<void>;

  writeAudit(input: {
    userId: number | null;
    action: string;
    ipHash?: string | null;
    details?: Record<string, string | number | boolean> | null;
  }): Promise<void>;
}
