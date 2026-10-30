import { ExternalLink } from 'lucide-react';
import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';
import styles from './ExternalAnchor.module.css';

interface ExternalAnchorProps {
  href: string;
  className?: string;
  children: ReactNode;
}

/** Lien vers un autre site : ouvert dans un nouvel onglet, sans transmettre de contexte (noopener). */
export function ExternalAnchor({ href, className, children }: ExternalAnchorProps) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cx(styles.link, className)}>
      {children}
      <ExternalLink size={16} aria-hidden="true" />
      <span className="visually-hidden"> (s’ouvre dans un nouvel onglet)</span>
    </a>
  );
}
