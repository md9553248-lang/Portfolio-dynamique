import type { ElementType, HTMLAttributes, ReactNode } from 'react';
import { cx } from '../../lib/cx';
import styles from './Card.module.css';

interface CardProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  as?: 'div' | 'article' | 'li' | 'section';
  /** Ajoute l'effet de survol (lueur et léger soulèvement). */
  interactive?: boolean;
  children: ReactNode;
}

export function Card({
  as: tagName = 'div',
  interactive = false,
  className,
  children,
  ...rest
}: CardProps) {
  const Tag: ElementType = tagName;

  return (
    <Tag className={cx(styles.card, interactive && styles.interactive, className)} {...rest}>
      {children}
    </Tag>
  );
}
