import { site } from '../../../data/site';
import styles from './Portrait.module.css';

const INITIALS = site.name
  .split(' ')
  .map((word) => word.charAt(0))
  .join('');

/** Emplacement de la photo : affiche les initiales en attendant la photo importée depuis l'administration. */
export function Portrait() {
  return (
    <div className={styles.portrait} aria-hidden="true">
      {INITIALS}
    </div>
  );
}
