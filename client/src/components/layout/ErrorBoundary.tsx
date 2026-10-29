import { Component, type ErrorInfo, type ReactNode } from 'react';
import { fr } from '../../i18n/fr';
import { Button } from '../ui/Button';
import { Container } from '../ui/Container';
import styles from './ErrorBoundary.module.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/** Affiche une page d'erreur adaptée si un composant plante, au lieu d'une page blanche. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Erreur d’affichage', error, info.componentStack);
  }

  override render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <Container className={styles.box}>
        <h1>{fr.pages.error.title}</h1>
        <p>{fr.pages.error.text}</p>
        {/* URL complète : provoque un rechargement réel de la page, ce qui efface l'état d'erreur. */}
        <Button href={`${window.location.origin}/`}>Retour à l’accueil</Button>
      </Container>
    );
  }
}
