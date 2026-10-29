import { cx } from '../../lib/cx';
import styles from './LightStreak.module.css';

/**
 * Trait de lumière horizontal, l'élément signature du site (clin d'œil aux reflets anamorphiques
 * du cinéma). À utiliser avec parcimonie : sous l'en-tête et pour séparer de grandes parties.
 */
export function LightStreak({ className }: { className?: string }) {
  return <div className={cx(styles.streak, className)} aria-hidden="true" />;
}
