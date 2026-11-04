/** Fenêtre d'observation des échecs de connexion, en minutes (utilisée par les requêtes SQL). */
export const THROTTLE_WINDOW_MINUTES = 15;

/** Nombre d'échecs tolérés pour un même e-mail depuis une même adresse avant d'imposer une attente. */
export const PAIR_FAILURE_THRESHOLD = 5;
/** Même principe pour un e-mail visé depuis n'importe quelle adresse (attaque répartie), plus tolérant. */
export const IDENTIFIER_FAILURE_THRESHOLD = 20;

const BASE_DELAY_SECONDS = 30;
const MAX_DELAY_SECONDS = 15 * 60;

/**
 * Délai à attendre avant de pouvoir retenter une connexion (en secondes, 0 si aucun).
 * Délai progressif : 30 s au seuil, puis il double à chaque échec supplémentaire, jusqu'à 15 minutes.
 * Pas de blocage définitif : un attaquant ne peut pas verrouiller durablement le compte légitime.
 */
export function loginDelaySeconds(params: {
  failureCount: number;
  secondsSinceLast: number;
  threshold: number;
}): number {
  const excess = params.failureCount - params.threshold;
  if (excess < 0) return 0;

  const wait = Math.min(MAX_DELAY_SECONDS, BASE_DELAY_SECONDS * 2 ** excess);
  const remaining = wait - params.secondsSinceLast;
  return remaining > 0 ? Math.ceil(remaining) : 0;
}
