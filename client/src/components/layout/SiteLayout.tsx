import type { ReactNode } from 'react';
import { ThemeToggle } from '../ui/ThemeToggle';
import { Footer } from './Footer';
import { Navbar, type NavLink } from './Navbar';
import { SkipLink } from './SkipLink';

interface SiteLayoutProps {
  siteName: string;
  links: NavLink[];
  currentHref?: string;
  children: ReactNode;
}

/** Structure commune à toutes les pages publiques : accès rapide, navigation, contenu, pied de page. */
export function SiteLayout({ siteName, links, currentHref, children }: SiteLayoutProps) {
  return (
    <>
      <SkipLink targetId="contenu" />
      <Navbar brand={siteName} links={links} currentHref={currentHref} actions={<ThemeToggle />} />
      <main id="contenu" tabIndex={-1}>
        {children}
      </main>
      <Footer siteName={siteName} />
    </>
  );
}
