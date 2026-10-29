import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { cx } from '../../lib/cx';
import styles from './Container.module.css';

interface ContainerProps extends Omit<ComponentPropsWithoutRef<'div'>, 'children'> {
  size?: 'default' | 'narrow';
  children: ReactNode;
}

export function Container({ size = 'default', className, children, ...rest }: ContainerProps) {
  return (
    <div className={cx(styles.container, size === 'narrow' && styles.narrow, className)} {...rest}>
      {children}
    </div>
  );
}
