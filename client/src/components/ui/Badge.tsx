import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';
import styles from './Badge.module.css';

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

interface BadgeProps {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}

export function Badge({ tone = 'neutral', className, children }: BadgeProps) {
  return <span className={cx(styles.badge, styles[tone], className)}>{children}</span>;
}
