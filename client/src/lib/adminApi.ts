export class AdminApiError extends Error {
  readonly status: number;
  readonly code: string | null;
  readonly details: unknown;

  constructor(status: number, code: string | null, message: string, details?: unknown) {
    super(message);
    this.name = 'AdminApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

const NETWORK_MESSAGE = 'Impossible de joindre le serveur. Vérifiez votre connexion puis réessayez.';

/** Transforme une réponse d'erreur du serveur en AdminApiError (le message du serveur est déjà en français). */
export async function toApiError(response: Response): Promise<AdminApiError> {
  try {
    const body = (await response.json()) as { error?: { code?: string; message?: string; details?: unknown } };
    return new AdminApiError(
      response.status,
      body.error?.code ?? null,
      body.error?.message ?? 'La demande a échoué.',
      body.error?.details,
    );
  } catch {
    return new AdminApiError(response.status, null, 'La demande a échoué.');
  }
}

export function networkError(): AdminApiError {
  return new AdminApiError(0, null, NETWORK_MESSAGE);
}

/**
 * Appel de l'API d'administration. Le cookie de session part automatiquement (même site) ; le jeton CSRF est
 * ajouté pour toute requête qui modifie des données.
 */
export async function adminRequest<T>(
  method: HttpMethod,
  path: string,
  options: { csrfToken: string | null; json?: unknown },
): Promise<T> {
  const headers: Record<string, string> = {};
  if (method !== 'GET' && options.csrfToken) headers['X-CSRF-Token'] = options.csrfToken;
  let body: string | undefined;
  if (options.json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.json);
  }

  let response: Response;
  try {
    response = await fetch(path, { method, credentials: 'same-origin', headers, body });
  } catch {
    throw networkError();
  }
  if (!response.ok) throw await toApiError(response);

  const parsed = (await response.json()) as { data: T };
  return parsed.data;
}
