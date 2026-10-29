import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';
import styles from './CinemaFrame.module.css';

interface CinemaFrameProps {
  /** cinema = 2,39:1 (pellicule), wide = 16:9, square = 1:1. */
  ratio?: 'cinema' | 'wide' | 'square';
  className?: string;
  children: ReactNode;
}

/** Cadre pour les images et vidéos de projets. Le contenu est rogné pour remplir le cadre. */
export function CinemaFrame({ ratio = 'cinema', className, children }: CinemaFrameProps) {
  return <div className={cx(styles.frame, styles[ratio], className)}>{children}</div>;
}
