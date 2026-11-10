import { useCallback, useEffect, useState } from 'react';
import { AdminApiError } from '../../lib/adminApi';
import { useAdminApi } from './useAdminApi';

type ResourceState<T> =
  | { status: 'loading'; data: T | null; error: null }
  | { status: 'ready'; data: T; error: null }
  | { status: 'error'; data: null; error: string };

/** Charge une ressource d'administration (GET) et permet de la recharger après une action. */
export function useAdminResource<T>(path: string) {
  const { request } = useAdminApi();
  const [state, setState] = useState<ResourceState<T>>({ status: 'loading', data: null, error: null });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    request<T>('GET', path).then(
      (data) => {
        if (!cancelled) setState({ status: 'ready', data, error: null });
      },
      (error: unknown) => {
        if (cancelled) return;
        const message = error instanceof AdminApiError ? error.message : 'Le chargement a échoué.';
        setState({ status: 'error', data: null, error: message });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [path, request, version]);

  const reload = useCallback(() => setVersion((value) => value + 1), []);
  return { ...state, reload };
}
