import type { ReactNode } from 'react';
import { Badge } from '../../../components/ui';
import { fr } from '../../../i18n/fr';
import styles from './DemoNotice.module.css';

/** Bandeau qui signale clairement un contenu de démonstration ou un texte provisoire. */
export function DemoNotice({ children }: { children?: ReactNode }) {
  return (
    <p className={styles.notice} role="note">
      <Badge tone="warning">{fr.demo.badge}</Badge>
      <span>{children ?? fr.demo.notice}</span>
    </p>
  );
}
