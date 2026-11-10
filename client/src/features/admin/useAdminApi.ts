import { useMemo } from 'react';
import { adminRequest, AdminApiError, type HttpMethod } from '../../lib/adminApi';
import { useAuth } from './AuthContext';

/** Appels de l'API d'administration avec le jeton CSRF. Une réponse 401 (session expirée) renvoie à la connexion. */
export function useAdminApi() {
  const { getCsrfToken, expireSession } = useAuth();

  return useMemo(
    () => ({
      getCsrfToken,
      request: async <T>(method: HttpMethod, path: string, json?: unknown): Promise<T> => {
        try {
          return await adminRequest<T>(method, path, { csrfToken: getCsrfToken(), json });
        } catch (error) {
          if (error instanceof AdminApiError && error.status === 401) expireSession();
          throw error;
        }
      },
      /** À appeler quand un envoi de fichier a échoué avec 401. */
      handleError: (error: unknown) => {
        if (error instanceof AdminApiError && error.status === 401) expireSession();
      },
    }),
    [getCsrfToken, expireSession],
  );
}
