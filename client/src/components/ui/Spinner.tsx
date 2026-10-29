import { cx } from '../../lib/cx';
import styles from './Spinner.module.css';

interface SpinnerProps {
  /** Texte lu par les lecteurs d'écran. */
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Spinner({ label = 'Chargement…', size = 'md', className }: SpinnerProps) {
  return (
    <span role="status" className={cx(styles.spinner, styles[size], className)}>
      <span className={styles.ring} aria-hidden="true" />
      <span className="visually-hidden">{label}</span>
    </span>
  );
}
