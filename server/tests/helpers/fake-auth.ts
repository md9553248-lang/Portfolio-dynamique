import type {
  AuthRepository,
  FailureStats,
  PublicUser,
  UserRecord,
} from '../../src/modules/auth/auth.repository.js';
import type { PasswordHasher } from '../../src/modules/auth/password-hasher.js';

/** Hacheur factice (rapide) pour les tests HTTP. Le vrai Argon2id est testé séparément. */
export const fakeHasher: PasswordHasher = {
  hash: async (password) => `fake$${password}`,
  verify: async (hash, password) => hash === `fake$${password}`,
  needsRehash: () => false,
};

interface StoredSession {
  userId: number;
  createdAt: number;
  lastSeenAt: number;
  expiresAt: number;
}

interface Attempt {
  identifierHash: string;
  ipHash: string;
  succeeded: boolean;
  at: number;
}

const WINDOW_SECONDS = 15 * 60;

/**
 * Dépôt en mémoire qui imite la logique SQL (expiration absolue, inactivité, fenêtre d'échecs)
 * avec une horloge que les tests peuvent avancer. Les vraies requêtes SQL sont testées sur MySQL.
 */
export function createFakeAuthRepository() {
  let clock = 1_000_000; // secondes
  let nextUserId = 1;
  const users = new Map<number, UserRecord>();
  const sessions = new Map<string, StoredSession>();
  const attempts: Attempt[] = [];
  const audit: Array<{ userId: number | null; action: string; ipHash?: string | null; details?: unknown }> = [];

  const toPublic = (user: UserRecord): PublicUser => ({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
  });

  const stats = (matches: (attempt: Attempt) => boolean): FailureStats['pair'] => {
    const recent = attempts.filter((a) => !a.succeeded && matches(a) && clock - a.at < WINDOW_SECONDS);
    const last = Math.max(...recent.map((a) => a.at), -Infinity);
    return { count: recent.length, secondsSinceLast: recent.length > 0 ? clock - last : 999_999_999 };
  };

  const repo: AuthRepository = {
    countUsers: async () => users.size,
    findUserByEmail: async (email) =>
      [...users.values()].find((user) => user.email.toLowerCase() === email.toLowerCase()) ?? null,
    findUserById: async (id) => users.get(id) ?? null,
    createUser: async ({ email, passwordHash, displayName }) => {
      const id = nextUserId++;
      users.set(id, { id, email, passwordHash, displayName, role: 'admin', isActive: true });
      return id;
    },
    updatePasswordHash: async (userId, passwordHash) => {
      const user = users.get(userId);
      if (user) user.passwordHash = passwordHash;
    },
    touchLastLogin: async () => {},

    createSession: async ({ tokenHash, userId, absoluteSeconds }) => {
      sessions.set(tokenHash, {
        userId,
        createdAt: clock,
        lastSeenAt: clock,
        expiresAt: clock + absoluteSeconds,
      });
    },
    findActiveSession: async (tokenHash, idleSeconds) => {
      const session = sessions.get(tokenHash);
      if (!session) return null;
      const user = users.get(session.userId);
      if (!user || !user.isActive) return null;
      if (session.expiresAt <= clock) return null;
      if (clock - session.lastSeenAt >= idleSeconds) return null;
      return { user: toPublic(user), idleSeconds: clock - session.lastSeenAt };
    },
    touchSession: async (tokenHash) => {
      const session = sessions.get(tokenHash);
      if (session) session.lastSeenAt = clock;
    },
    deleteSession: async (tokenHash) => {
      sessions.delete(tokenHash);
    },
    deleteSessionsForUser: async (userId, exceptTokenHash) => {
      for (const [hash, session] of sessions) {
        if (session.userId === userId && hash !== exceptTokenHash) sessions.delete(hash);
      }
    },
    deleteExpiredSessions: async (idleSeconds) => {
      for (const [hash, session] of sessions) {
        if (session.expiresAt <= clock || clock - session.lastSeenAt >= idleSeconds) sessions.delete(hash);
      }
    },

    recordLoginAttempt: async ({ identifierHash, ipHash, succeeded }) => {
      attempts.push({ identifierHash, ipHash, succeeded, at: clock });
    },
    clearFailedAttempts: async ({ identifierHash, ipHash }) => {
      for (let index = attempts.length - 1; index >= 0; index--) {
        const attempt = attempts[index];
        if (attempt && !attempt.succeeded && attempt.identifierHash === identifierHash && attempt.ipHash === ipHash) {
          attempts.splice(index, 1);
        }
      }
    },
    getFailureStats: async ({ identifierHash, ipHash }) => ({
      pair: stats((a) => a.identifierHash === identifierHash && a.ipHash === ipHash),
      identifier: stats((a) => a.identifierHash === identifierHash),
    }),
    purgeOldLoginAttempts: async () => {},

    writeAudit: async (entry) => {
      audit.push(entry);
    },
  };

  return {
    repo,
    sessions,
    audit,
    attempts,
    users,
    /** Fait avancer l'horloge simulée. */
    advance: (seconds: number) => {
      clock += seconds;
    },
    /** Ajoute un compte dont le mot de passe est celui fourni (haché avec le hacheur factice). */
    addUser: (input: { email: string; password: string; displayName?: string; role?: string; isActive?: boolean }) => {
      const id = nextUserId++;
      users.set(id, {
        id,
        email: input.email,
        displayName: input.displayName ?? 'Administrateur Test',
        role: input.role ?? 'admin',
        passwordHash: `fake$${input.password}`,
        isActive: input.isActive ?? true,
      });
      return id;
    },
  };
}

export type FakeAuth = ReturnType<typeof createFakeAuthRepository>;
