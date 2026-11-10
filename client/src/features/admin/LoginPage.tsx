import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { Button, Container, Spinner, TextField } from '../../components/ui';
import { usePageMeta } from '../../hooks/usePageMeta';
import { AuthRequestError } from '../../lib/authClient';
import { useAuth } from './AuthContext';
import styles from './admin.module.css';

export function LoginPage() {
  usePageMeta('Connexion');
  const { status, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (status === 'authenticated') return <Navigate to="/admin" replace />;
  if (status === 'loading') {
    return (
      <Container className={styles.page}>
        <Spinner label="Vérification de la session…" />
      </Container>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    if (email.trim() === '' || password === '') {
      setError('Saisissez votre adresse e-mail et votre mot de passe.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
    } catch (caught) {
      setError(caught instanceof AuthRequestError ? caught.message : 'La connexion a échoué. Réessayez.');
      setPassword(''); // on n'oublie jamais de vider le mot de passe après un échec
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main>
    <Container size="narrow" className={styles.page}>
      <h1>Connexion</h1>
      <p className={styles.muted}>Espace réservé au propriétaire du site.</p>

      <form
        className={styles.form}
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
        noValidate
      >
        <TextField
          label="Adresse e-mail"
          name="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <TextField
          label="Mot de passe"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}

        <div>
          <Button type="submit" loading={submitting}>
            Se connecter
          </Button>
        </div>
      </form>
    </Container>
    </main>
  );
}
