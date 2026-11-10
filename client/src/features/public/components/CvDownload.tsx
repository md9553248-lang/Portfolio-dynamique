import { Download } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '../../../components/ui';

type CvState = 'loading' | 'available' | 'unavailable';

/**
 * Bouton public « Télécharger mon CV ».
 * Il interroge l'API à chaque affichage de la page : dès qu'un CV est publié (ou masqué) depuis l'administration,
 * le bouton apparaît (ou disparaît), sans modifier le code ni redéployer le site.
 * Quand aucun CV n'est publié, ou si l'état est inaccessible, le bouton est simplement masqué.
 */
export function CvDownload() {
  const [state, setState] = useState<CvState>('loading');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/public/cv')
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { data?: { available?: boolean } } | null) => {
        if (!cancelled) setState(body?.data?.available ? 'available' : 'unavailable');
      })
      .catch(() => {
        if (!cancelled) setState('unavailable');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state !== 'available') return null;

  return (
    <Button href="/api/public/cv/download" variant="ghost" size="lg">
      <Download size={18} aria-hidden="true" />
      Télécharger mon CV
    </Button>
  );
}
