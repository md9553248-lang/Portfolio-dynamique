import { SiteLayout } from './components/layout';
import { StyleGuidePage } from './features/style-guide/StyleGuidePage';

const NAV_LINKS = [
  { label: 'Couleurs', href: '#couleurs' },
  { label: 'Typographie', href: '#typographie' },
  { label: 'Composants', href: '#composants' },
  { label: 'Formulaires', href: '#formulaires' },
];

/**
 * Phase 02 : l'application affiche le guide de style du design system.
 * Le routage et les vraies pages publiques arrivent en Phase 03.
 */
export default function App() {
  return (
    <SiteLayout siteName="Portfolio" links={NAV_LINKS}>
      <StyleGuidePage />
    </SiteLayout>
  );
}
