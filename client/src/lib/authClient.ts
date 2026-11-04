export interface AuthUser {
  id: number;
  email: string;
  displayName: string;
  role: string;
}

export interface SessionData {
  user: AuthUser;
  /** Jeton à renvoyer dans l'en-tête X-CSRF-Token pour toute requête qui modifie des données. */
  csrfToken: string;
}

export class AuthRequestError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'AuthRequestError';
    this.status = status;
  }
}

function describeWait(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return 'quelques instants';
  if (seconds < 60) return `${Math.ceil(seconds)} secondes`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes > 1 ? 's' : ''}`;
}

async function readSession(response: Response): Promise<SessionData> {
  const body = (await response.json()) as { data?: SessionData };
  if (!body.data) throw new AuthRequestError(response.status, 'Réponse inattendue du serveur.');
  return body.data;
}

/** Interroge le serveur : la session est dans un cookie HttpOnly que JavaScript ne peut pas lire. */
export async function fetchSession(): Promise<SessionData | null> {
  const response = await fetch('/api/auth/me', { credentials: 'same-origin' });
  if (response.status === 401) return null;
  if (!response.ok) throw new AuthRequestError(response.status, 'Impossible de vérifier votre session.');
  return readSession(response);
}

export async function login(email: string, password: string): Promise<SessionData> {
  let response: Response;
  try {
    response = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    throw new AuthRequestError(0, 'Impossible de joindre le serveur. Vérifiez votre connexion puis réessayez.');
  }

  if (response.ok) return readSession(response);
  if (response.status === 401) throw new AuthRequestError(401, 'Identifiants incorrects.');
  if (response.status === 429) {
    const wait = describeWait(Number(response.headers.get('Retry-After')));
    throw new AuthRequestError(429, `Trop de tentatives de connexion. Réessayez dans ${wait}.`);
  }
  if (response.status === 400) {
    throw new AuthRequestError(400, 'Saisissez votre adresse e-mail et votre mot de passe.');
  }
  throw new AuthRequestError(response.status, 'La connexion a échoué. Réessayez dans quelques instants.');
}

export async function logout(csrfToken: string): Promise<void> {
  let response: Response;
  try {
    response = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'X-CSRF-Token': csrfToken },
    });
  } catch {
    throw new AuthRequestError(0, 'Impossible de joindre le serveur : la déconnexion n’a pas pu être effectuée.');
  }
  if (!response.ok) {
    throw new AuthRequestError(response.status, 'La déconnexion a échoué. Réessayez.');
  }
}
