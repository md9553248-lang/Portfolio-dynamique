import type { ReactNode } from 'react';
import { Container } from './Container';
import styles from './Section.module.css';

interface SectionProps {
  /** Identifiant de la section, utilisé aussi pour les liens d'ancre. */
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
}

export function Section({ id, title, description, children }: SectionProps) {
  const headingId = `${id}-titre`;
  return (
    <section id={id} aria-labelledby={headingId} className={styles.section}>
      <Container>
        <header className={styles.header}>
          <h2 id={headingId}>{title}</h2>
          {description && <p className={styles.description}>{description}</p>}
        </header>
        {children}
      </Container>
    </section>
  );
}
