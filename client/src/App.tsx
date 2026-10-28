import { useEffect, useState } from 'react';

type ApiStatus = 'checking' | 'online' | 'offline';

const STATUS_LABELS: Record<ApiStatus, string> = {
  checking: 'Vérification de l’API…',
  online: 'API disponible',
  offline: 'API indisponible',
};

/**
 * Page technique PROVISOIRE de la Phase 01.
 * Elle sert uniquement à vérifier que le frontend et le backend communiquent.
 * Le vrai site public est construit en Phase 03 (aucune donnée dynamique pour l'instant).
 */
export default function App() {
  const [status, setStatus] = useState<ApiStatus>('checking');

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
    <main>
      <h1>Portfolio</h1>
      <p>Phase 01 : initialisation du projet. Cette page est technique et provisoire.</p>
      <p role="status">{STATUS_LABELS[status]}</p>
    </main>
  );
}
