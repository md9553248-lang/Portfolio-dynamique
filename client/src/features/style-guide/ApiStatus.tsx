import { useEffect, useState } from 'react';
import { Badge } from '../../components/ui';

type ApiStatusValue = 'checking' | 'online' | 'offline';

const LABELS: Record<ApiStatusValue, string> = {
  checking: 'Vérification de l’API…',
  online: 'API disponible',
  offline: 'API indisponible',
};

const TONES = { checking: 'neutral', online: 'success', offline: 'danger' } as const;

/** Vérifie que le frontend joint bien le backend (GET /api/health). */
export function ApiStatus() {
  const [status, setStatus] = useState<ApiStatusValue>('checking');

  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/health', { signal: controller.signal })
      .then((response) => setStatus(response.ok ? 'online' : 'offline'))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setStatus('offline');
      });

    return () => controller.abort();
  }, []);

  return (
    <p role="status">
      <Badge tone={TONES[status]}>{LABELS[status]}</Badge>
    </p>
  );
}
