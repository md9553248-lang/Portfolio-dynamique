import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { fetchSession, login, logout, type AuthUser } from '../../lib/authClient';

type AuthStatus = 'loading' | 'authenticated' | 'anonymous' | 'error';

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * État d'authentification de l'espace d'administration.
 * - La session elle-même est un cookie HttpOnly : le navigateur la gère, le code JavaScript ne la voit jamais.
 * - Le jeton CSRF est gardé en mémoire seulement (jamais dans localStorage) : il disparaît au rechargement
 *   de la page et est récupéré de nouveau auprès du serveur.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ status: AuthStatus; user: AuthUser | null }>({
    status: 'loading',
    user: null,
  });
  const csrfToken = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchSession().then(
      (session) => {
        if (cancelled) return;
        csrfToken.current = session?.csrfToken ?? null;
        setState(session ? { status: 'authenticated', user: session.user } : { status: 'anonymous', user: null });
      },
      () => {
        if (!cancelled) setState({ status: 'error', user: null });
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const session = await login(email, password);
    csrfToken.current = session.csrfToken;
    setState({ status: 'authenticated', user: session.user });
  }, []);

  const signOut = useCallback(async () => {
    // Si le serveur n'a pas confirmé la déconnexion, on reste connecté à l'écran (et on signale l'erreur).
    if (csrfToken.current) await logout(csrfToken.current);
    csrfToken.current = null;
    setState({ status: 'anonymous', user: null });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status: state.status, user: state.user, signIn, signOut }),
    [state, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth doit être utilisé à l’intérieur de AuthProvider.');
  return value;
}
