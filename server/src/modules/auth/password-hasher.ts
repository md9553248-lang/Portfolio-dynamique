import argon2 from 'argon2';

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(hash: string, password: string): Promise<boolean>;
  /** Vrai si l'empreinte a été faite avec des paramètres plus faibles que les paramètres actuels. */
  needsRehash(hash: string): boolean;
}

/** Paramètres Argon2id : valeurs minimales recommandées par l'OWASP (19 Mio de mémoire, 2 passes). */
const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

export function createArgon2Hasher(): PasswordHasher {
  return {
    hash: (password) => argon2.hash(password, ARGON2_OPTIONS),
    verify: async (hash, password) => {
      try {
        return await argon2.verify(hash, password);
      } catch {
        // Une empreinte illisible ne doit jamais faire planter la connexion : on refuse simplement.
        return false;
      }
    },
    needsRehash: (hash) => argon2.needsRehash(hash, ARGON2_OPTIONS),
  };
}
