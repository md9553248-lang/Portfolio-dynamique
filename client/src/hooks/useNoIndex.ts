import { useEffect } from 'react';

/** Demande aux moteurs de recherche de ne pas référencer cette page (espace d'administration). */
export function useNoIndex(): void {
  useEffect(() => {
    const tag = document.createElement('meta');
    tag.name = 'robots';
    tag.content = 'noindex, nofollow';
    document.head.append(tag);
    return () => tag.remove();
  }, []);
}
