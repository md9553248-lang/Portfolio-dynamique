import { useState } from 'react';
import { Badge, Button, Container } from '../../components/ui';
import { usePageMeta } from '../../hooks/usePageMeta';
import { AuthRequestError } from '../../lib/authClient';
import { useAuth } from './AuthContext';
import styles from './admin.module.css';

/**
 * Page d'accueil PROVISOIRE de l'administration (Phase 06).
 * Elle prouve que l'authentification fonctionne. Les écrans de gestion arrivent en Phase 07.
 */
export function AdminHomePage() {
  usePageMeta('Administration');
  const { user, signOut } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignOut() {
    setPending(true);
    setError(null);
    try {
      await signOut();
    } catch (caught) {
      setError(caught instanceof AuthRequestError ? caught.message : 'La déconnexion a échoué. Réessayez.');
      setPending(false);
    }
  }

  return (
    <Container size="narrow" className={styles.page}>
      <h1>Administration</h1>
      <p>Connecté en tant que {user?.displayName}.</p>
      <p className={styles.note}>
        <Badge tone="warning">Provisoire</Badge>
        <span>Les écrans de gestion (projets, CV, messages...) arrivent à la phase suivante.</span>
      </p>

      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}

      <div>
        <Button
          variant="secondary"
          loading={pending}
          onClick={() => {
            void handleSignOut();
          }}
        >
          Se déconnecter
        </Button>
      </div>
    </Container>
  );
}
