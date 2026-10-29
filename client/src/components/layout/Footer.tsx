import { Link } from 'react-router-dom';
import { Container } from '../ui/Container';
import { ExternalAnchor } from '../ui/ExternalAnchor';
import { LightStreak } from '../ui/LightStreak';
import type { NavItem } from './Navbar';
import styles from './Footer.module.css';

interface SocialLink {
  label: string;
  href: string;
}

interface FooterProps {
  siteName: string;
  tagline: string;
  navLinks: NavItem[];
  legalLinks: NavItem[];
  socialLinks: readonly SocialLink[];
}

export function Footer({ siteName, tagline, navLinks, legalLinks, socialLinks }: FooterProps) {
  return (
    <footer className={styles.footer}>
      <LightStreak />
      <Container className={styles.grid}>
        <div className={styles.about}>
          <p className={styles.name}>{siteName}</p>
          <p className={styles.muted}>{tagline}</p>
        </div>

        <nav aria-label="Pages du site">
          <ul className={styles.list}>
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link to={link.href}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.column}>
          <nav aria-label="Informations légales">
            <ul className={styles.list}>
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link to={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
          {socialLinks.length > 0 && (
            <ul className={styles.list} aria-label="Réseaux">
              {socialLinks.map((link) => (
                <li key={link.href}>
                  <ExternalAnchor href={link.href}>{link.label}</ExternalAnchor>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Container>
      <Container className={styles.bottom}>
        <p>
          © {new Date().getFullYear()} {siteName}
        </p>
      </Container>
    </footer>
  );
}
