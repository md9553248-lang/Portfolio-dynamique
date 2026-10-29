import type { ReactNode } from 'react';
import { Container } from '../ui/Container';
import { LightStreak } from '../ui/LightStreak';
import styles from './Footer.module.css';

interface FooterProps {
  siteName: string;
  /** Liens ou informations supplémentaires (pages légales, réseaux), ajoutés en Phase 03. */
  children?: ReactNode;
}

export function Footer({ siteName, children }: FooterProps) {
  return (
    <footer className={styles.footer}>
      <LightStreak />
      <Container className={styles.inner}>
        <p>
          © {new Date().getFullYear()} {siteName}
        </p>
        {children}
      </Container>
    </footer>
  );
}
