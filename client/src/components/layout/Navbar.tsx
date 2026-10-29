import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { cx } from '../../lib/cx';
import { LightStreak } from '../ui/LightStreak';
import styles from './Navbar.module.css';

export interface NavItem {
  label: string;
  href: string;
}

interface NavbarProps {
  brand: string;
  links: NavItem[];
  /** Éléments à droite (bascule de thème, etc.). */
  actions?: ReactNode;
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true" focusable="false">
      {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
    </svg>
  );
}

export function Navbar({ brand, links, actions }: NavbarProps) {
  const [open, setOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  // Échap ferme le menu mobile et redonne le focus au bouton.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link className={styles.brand} to="/" onClick={() => setOpen(false)}>
          {brand}
        </Link>

        <nav aria-label="Navigation principale" className={styles.nav}>
          <ul id={menuId} className={cx(styles.list, open && styles.open)}>
            {links.map((link) => (
              <li key={link.href}>
                {/* NavLink ajoute lui-même aria-current="page" sur la page affichée. */}
                <NavLink className={styles.link} to={link.href} onClick={() => setOpen(false)}>
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.actions}>
          {actions}
          <button
            ref={menuButtonRef}
            type="button"
            className={styles.menuButton}
            aria-expanded={open}
            aria-controls={menuId}
            onClick={() => setOpen((value) => !value)}
          >
            <span className="visually-hidden">{open ? 'Fermer le menu' : 'Ouvrir le menu'}</span>
            <MenuIcon open={open} />
          </button>
        </div>
      </div>
      <LightStreak className={styles.streak} />
    </header>
  );
}
