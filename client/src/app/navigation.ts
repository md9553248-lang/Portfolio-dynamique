import type { NavItem } from '../components/layout';
import { fr } from '../i18n/fr';

export const NAV_LINKS: NavItem[] = [
  { label: fr.nav.about, href: '/a-propos' },
  { label: fr.nav.projects, href: '/projets' },
  { label: fr.nav.skills, href: '/competences' },
  { label: fr.nav.experiences, href: '/experiences' },
  { label: fr.nav.education, href: '/formations' },
  { label: fr.nav.certifications, href: '/certifications' },
  { label: fr.nav.news, href: '/actualites' },
  { label: fr.nav.contact, href: '/contact' },
];

export const LEGAL_LINKS: NavItem[] = [
  { label: fr.pages.privacy.title, href: '/confidentialite' },
  { label: fr.pages.legal.title, href: '/mentions-legales' },
];
