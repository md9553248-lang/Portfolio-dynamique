import { useEffect } from 'react';
import { site } from '../data/site';

/**
 * Met à jour le titre de l'onglet et la description de la page.
 * Les balises Open Graph et le référencement côté serveur arrivent dans une phase ultérieure.
 */
export function usePageMeta(title: string | null, description?: string): void {
  useEffect(() => {
    document.title = title ? `${title} · ${site.name}` : `${site.name} · ${site.title}`;

    if (description !== undefined) {
      let tag = document.querySelector<HTMLMetaElement>('meta[name="description"]');
      if (!tag) {
        tag = document.createElement('meta');
        tag.name = 'description';
        document.head.append(tag);
      }
      tag.content = description;
    }
  }, [title, description]);
}
