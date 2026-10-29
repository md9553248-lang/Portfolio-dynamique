import { Badge } from '../../../components/ui';

/**
 * État public du CV.
 * Le CV sera importé et publié depuis l'administration (Phase 07). Tant qu'aucun CV n'est publié,
 * on n'affiche aucun bouton de téléchargement : seulement un état clair.
 */
export function CvDownload() {
  return <Badge tone="neutral">CV bientôt disponible</Badge>;
}
