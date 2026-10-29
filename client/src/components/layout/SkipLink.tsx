import styles from './SkipLink.module.css';

/** Premier élément focusable de la page : permet aux utilisateurs du clavier d'éviter la navigation. */
export function SkipLink({ targetId = 'contenu' }: { targetId?: string }) {
  return (
    <a className={styles.skip} href={`#${targetId}`}>
      Aller au contenu principal
    </a>
  );
}
