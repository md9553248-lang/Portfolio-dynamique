import { Navigate, Outlet } from 'react-router-dom';
import { Button, Container, Spinner } from '../../components/ui';
import { useAuth } from './AuthContext';
import styles from './admin.module.css';

/**
 * Garde d'affichage : renvoie vers la connexion si on n'est pas authentifié.
 * Ce n'est qu'un confort d'interface : la VRAIE protection est faite par le serveur sur chaque route /api/admin.
 */
export function RequireAuth() {
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <Container className={styles.page}>
        <Spinner label="Vérification de la session…" />
      </Container>
    );
  }
  if (status === 'error') {
    return (
      <Container className={styles.page}>
        <h1>Vérification impossible</h1>
        <p role="alert">Impossible de vérifier votre session pour le moment.</p>
        <Button onClick={() => window.location.reload()}>Réessayer</Button>
      </Container>
    );
  }
  if (status === 'anonymous') return <Navigate to="/admin/connexion" replace />;
  return <Outlet />;
}
