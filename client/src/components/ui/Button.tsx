import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cx } from '../../lib/cx';
import styles from './Button.module.css';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface CommonProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}

type ButtonAsButton = CommonProps & {
  href?: undefined;
  /** Désactive le bouton et affiche un indicateur de chargement. */
  loading?: boolean;
} & Omit<ComponentPropsWithoutRef<'button'>, keyof CommonProps>;

type ButtonAsLink = CommonProps & {
  href: string;
} & Omit<ComponentPropsWithoutRef<'a'>, keyof CommonProps | 'href'>;

export type ButtonProps = ButtonAsButton | ButtonAsLink;

/** Un chemin interne au site commence par « / » (et pas « // »). */
function isInternalPath(href: string): boolean {
  return href.startsWith('/') && !href.startsWith('//');
}

/**
 * Bouton, ou lien d'apparence bouton lorsque `href` est fourni.
 * Les chemins internes (« /projets ») utilisent le routeur, sans rechargement de la page.
 */
export function Button(props: ButtonProps) {
  if (props.href !== undefined) {
    const { variant = 'primary', size = 'md', className, children, href, ...rest } = props;
    const classes = cx(styles.button, styles[variant], styles[size], className);

    if (isInternalPath(href)) {
      return (
        <Link to={href} className={classes} {...rest}>
          {children}
        </Link>
      );
    }
    return (
      <a href={href} className={classes} {...rest}>
        {children}
      </a>
    );
  }

  const {
    variant = 'primary',
    size = 'md',
    className,
    children,
    loading = false,
    disabled,
    type = 'button',
    ...rest
  } = props;

  return (
    <button
      type={type}
      className={cx(styles.button, styles[variant], styles[size], loading && styles.loading, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <Spinner size="sm" label="Chargement…" />}
      {children}
    </button>
  );
}
