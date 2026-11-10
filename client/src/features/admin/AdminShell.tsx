import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Button, ThemeToggle } from '../../components/ui';
import { SkipLink } from '../../components/layout';
import { AuthRequestError } from '../../lib/authClient';
import { useAuth } from './AuthContext';
import styles from './AdminShell.module.css';

const LINKS = [
  { to: '/admin', label: 'Tableau de bord', end: true },
  { to: '/admin/cv', label: 'CV', end: false },
  { to: '/admin/medias', label: 'Médias', end: false },
];

/** Cadre de l'administration : identité, déconnexion et navigation entre les écrans de gestion. */
export function AdminShell() {
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
    <div className={styles.shell}>
      <SkipLink targetId="admin-contenu" />
      <header className={styles.header}>
        <div className={styles.bar}>
          <span className={styles.brand}>Administration</span>
          <div className={styles.user}>
            <span>Connecté en tant que {user?.displayName}</span>
            <ThemeToggle />
            <Button
              variant="secondary"
              size="sm"
              loading={pending}
              onClick={() => {
                void handleSignOut();
              }}
            >
              Se déconnecter
            </Button>
          </div>
        </div>
        {error && (
          <p role="alert" style={{ padding: '0 var(--gutter)', color: 'var(--color-danger)' }}>
            {error}
          </p>
        )}
        <nav className={styles.nav} aria-label="Navigation de l’administration">
          <ul className={styles.list}>
            {LINKS.map((link) => (
              <li key={link.to}>
                <NavLink className={styles.link} to={link.to} end={link.end}>
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main id="admin-contenu" tabIndex={-1} className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
