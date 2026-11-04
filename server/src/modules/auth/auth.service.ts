import { randomBytes } from 'node:crypto';
import type { Logger } from 'pino';
import { HttpError, ValidationError } from '../../http/errors.js';
import { hmacHash } from '../../utils/hash.js';
import type { AuthRepository, PublicUser, UserRecord } from './auth.repository.js';
import {
  IDENTIFIER_FAILURE_THRESHOLD,
  loginDelaySeconds,
  PAIR_FAILURE_THRESHOLD,
} from './login-throttle.js';
import type { PasswordHasher } from './password-hasher.js';
import { validatePasswordStrength } from './password-policy.js';
import { generateSessionToken, hashSessionToken, isWellFormedToken } from './session-cookie.js';

/** Même réponse que le compte existe ou non : on ne révèle jamais quels comptes existent. */
export class InvalidCredentialsError extends HttpError {
  constructor() {
    super(401, 'INVALID_CREDENTIALS', 'Identifiants incorrects.');
    this.name = 'InvalidCredentialsError';
  }
}

export class TooManyAttemptsError extends HttpError {
  constructor(retryAfterSeconds: number) {
    super(
      429,
      'TOO_MANY_ATTEMPTS',
      'Trop de tentatives de connexion. Réessayez dans quelques instants.',
      undefined,
      { 'Retry-After': String(retryAfterSeconds) },
    );
    this.name = 'TooManyAttemptsError';
  }
}

export interface AuthServiceOptions {
  repo: AuthRepository;
  hasher: PasswordHasher;
  /** Secret servant à calculer les empreintes des adresses IP et des e-mails saisis. */
  ipHashSecret: string;
  absoluteSessionSeconds: number;
  idleSessionSeconds: number;
  logger: Logger;
}

/** La date de dernière activité n'est réécrite qu'au bout de ce délai, pour éviter une écriture à chaque requête. */
const TOUCH_INTERVAL_SECONDS = 60;

function toPublicUser(user: UserRecord): PublicUser {
  return { id: user.id, email: user.email, displayName: user.displayName, role: user.role };
}

export function createAuthService(options: AuthServiceOptions) {
  const { repo, hasher } = options;

  // Empreinte factice, calculée une seule fois : sert à occuper le même temps de calcul quand le compte n'existe pas.
  let dummyHash: Promise<string> | undefined;
  const getDummyHash = () => (dummyHash ??= hasher.hash(randomBytes(16).toString('hex')));

  return {
    async login(
      input: { email: string; password: string },
      context: { ip: string; userAgent: string },
    ): Promise<{ token: string; user: PublicUser }> {
      const ipHash = hmacHash(options.ipHashSecret, context.ip);
      const identifierHash = hmacHash(options.ipHashSecret, input.email);

      // 1. Délai progressif après des échecs répétés (calculé sans révéler si le compte existe).
      const stats = await repo.getFailureStats({ identifierHash, ipHash });
      const wait = Math.max(
        loginDelaySeconds({
          failureCount: stats.pair.count,
          secondsSinceLast: stats.pair.secondsSinceLast,
          threshold: PAIR_FAILURE_THRESHOLD,
        }),
        loginDelaySeconds({
          failureCount: stats.identifier.count,
          secondsSinceLast: stats.identifier.secondsSinceLast,
          threshold: IDENTIFIER_FAILURE_THRESHOLD,
        }),
      );
      if (wait > 0) {
        await repo.writeAudit({ userId: null, action: 'auth.login_throttled', ipHash });
        throw new TooManyAttemptsError(wait);
      }

      // 2. Vérification du mot de passe. Si le compte n'existe pas (ou est désactivé), on vérifie quand même
      //    une empreinte factice : le temps de réponse ne permet pas de deviner quels e-mails existent.
      const user = await repo.findUserByEmail(input.email);
      const usable = user !== null && user.isActive;
      const passwordOk = await hasher.verify(usable ? user.passwordHash : await getDummyHash(), input.password);

      if (!usable || !passwordOk) {
        await repo.recordLoginAttempt({ identifierHash, ipHash, succeeded: false });
        await repo.writeAudit({ userId: user?.id ?? null, action: 'auth.login_failed', ipHash });
        throw new InvalidCredentialsError();
      }

      // 3. Succès : on remet les compteurs à zéro, on met à niveau l'empreinte si besoin, on ouvre une NOUVELLE session.
      await repo.clearFailedAttempts({ identifierHash, ipHash });
      await repo.recordLoginAttempt({ identifierHash, ipHash, succeeded: true });
      if (hasher.needsRehash(user.passwordHash)) {
        await repo.updatePasswordHash(user.id, await hasher.hash(input.password));
      }

      const token = generateSessionToken();
      await repo.createSession({
        tokenHash: hashSessionToken(token),
        userId: user.id,
        ipHash,
        userAgent: context.userAgent.slice(0, 255),
        absoluteSeconds: options.absoluteSessionSeconds,
      });
      await repo.touchLastLogin(user.id);
      await repo.writeAudit({ userId: user.id, action: 'auth.login', ipHash });
      return { token, user: toPublicUser(user) };
    },

    /** Renvoie l'utilisateur de la session si elle est valide (non expirée, compte actif), sinon null. */
    async authenticate(token: string): Promise<{ user: PublicUser; tokenHash: string } | null> {
      if (!isWellFormedToken(token)) return null;
      const tokenHash = hashSessionToken(token);
      const session = await repo.findActiveSession(tokenHash, options.idleSessionSeconds);
      if (!session) return null;
      if (session.idleSeconds >= TOUCH_INTERVAL_SECONDS) await repo.touchSession(tokenHash);
      return { user: session.user, tokenHash };
    },

    async logout(tokenHash: string, userId: number | null, ipHash?: string): Promise<void> {
      await repo.deleteSession(tokenHash);
      if (userId !== null) await repo.writeAudit({ userId, action: 'auth.logout', ipHash: ipHash ?? null });
    },

    async changePassword(input: {
      userId: number;
      currentTokenHash: string;
      currentPassword: string;
      newPassword: string;
      ipHash: string;
    }): Promise<void> {
      const user = await repo.findUserById(input.userId);
      if (!user || !user.isActive) throw new InvalidCredentialsError();

      if (!(await hasher.verify(user.passwordHash, input.currentPassword))) {
        await repo.writeAudit({ userId: user.id, action: 'auth.password_change_failed', ipHash: input.ipHash });
        throw new ValidationError({ currentPassword: 'Le mot de passe actuel est incorrect.' });
      }
      const weakness = validatePasswordStrength(input.newPassword, {
        email: user.email,
        displayName: user.displayName,
      });
      if (weakness) throw new ValidationError({ newPassword: weakness });
      if (input.newPassword === input.currentPassword) {
        throw new ValidationError({ newPassword: 'Le nouveau mot de passe doit être différent de l’actuel.' });
      }

      await repo.updatePasswordHash(user.id, await hasher.hash(input.newPassword));
      // Toutes les autres sessions (autres appareils, éventuel voleur de session) sont fermées.
      await repo.deleteSessionsForUser(user.id, input.currentTokenHash);
      await repo.writeAudit({ userId: user.id, action: 'auth.password_changed', ipHash: input.ipHash });
    },

    /** Création d'un compte administrateur (réservée aux commandes en ligne, jamais exposée par l'API). */
    async createAdmin(input: { email: string; displayName: string; password: string }): Promise<number> {
      const weakness = validatePasswordStrength(input.password, {
        email: input.email,
        displayName: input.displayName,
      });
      if (weakness) throw new ValidationError({ password: weakness });

      const id = await repo.createUser({
        email: input.email,
        displayName: input.displayName,
        passwordHash: await hasher.hash(input.password),
      });
      await repo.writeAudit({ userId: id, action: 'admin.created' });
      return id;
    },

    /** Redéfinition d'un mot de passe en ligne de commande (mot de passe oublié) ; ferme toutes les sessions. */
    async resetPassword(input: { email: string; password: string }): Promise<boolean> {
      const user = await repo.findUserByEmail(input.email);
      if (!user) return false;
      const weakness = validatePasswordStrength(input.password, {
        email: user.email,
        displayName: user.displayName,
      });
      if (weakness) throw new ValidationError({ password: weakness });

      await repo.updatePasswordHash(user.id, await hasher.hash(input.password));
      await repo.deleteSessionsForUser(user.id);
      await repo.writeAudit({ userId: user.id, action: 'admin.password_reset' });
      return true;
    },

    /** Nettoyage : sessions expirées et anciennes tentatives de connexion. */
    async purge(): Promise<void> {
      await repo.deleteExpiredSessions(options.idleSessionSeconds);
      await repo.purgeOldLoginAttempts();
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
