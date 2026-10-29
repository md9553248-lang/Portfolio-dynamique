import type { ReactNode } from 'react';
import { ThemeToggle } from '../ui/ThemeToggle';
import { Footer } from './Footer';
import { Navbar, type NavItem } from './Navbar';
import { SkipLink } from './SkipLink';
import styles from './SiteLayout.module.css';

interface SiteLayoutProps {
  siteName: string;
  tagline: string;
  navLinks: NavItem[];
  legalLinks: NavItem[];
  socialLinks: readonly { label: string; href: string }[];
  children: ReactNode;
}

/** Structure commune à toutes les pages : accès rapide, navigation, contenu, pied de page. */
export function SiteLayout({
  siteName,
  tagline,
  navLinks,
  legalLinks,
  socialLinks,
  children,
}: SiteLayoutProps) {
  return (
    <>
      <SkipLink targetId="contenu" />
      <Navbar brand={siteName} links={navLinks} actions={<ThemeToggle />} />
      <main id="contenu" tabIndex={-1} className={styles.main}>
        {children}
      </main>
      <Footer
        siteName={siteName}
        tagline={tagline}
        navLinks={navLinks}
        legalLinks={legalLinks}
        socialLinks={socialLinks}
      />
    </>
  );
}
