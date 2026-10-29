import { Button, Container } from '../../../components/ui';
import { usePageMeta } from '../../../hooks/usePageMeta';
import { fr } from '../../../i18n/fr';
import styles from './NotFoundPage.module.css';

export function NotFoundPage() {
  usePageMeta(fr.pages.notFound.title);

  return (
    <Container className={styles.box}>
      <h1>{fr.pages.notFound.title}</h1>
      <p>{fr.pages.notFound.text}</p>
      <Button href="/">Retour à l’accueil</Button>
    </Container>
  );
}
