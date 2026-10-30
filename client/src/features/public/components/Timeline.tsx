import type { ReactNode } from 'react';
import { Badge } from '../../../components/ui';
import { fr } from '../../../i18n/fr';
import styles from './Timeline.module.css';

export function Timeline({ children }: { children: ReactNode }) {
  return <ol className={styles.timeline}>{children}</ol>;
}

interface TimelineItemProps {
  title: string;
  subtitle: string;
  period?: string;
  demo?: boolean;
  children?: ReactNode;
}

export function TimelineItem({
  title,
  subtitle,
  period,
  demo = false,
  children,
}: TimelineItemProps) {
  return (
    <li className={styles.item}>
      <div className={styles.head}>
        <h2 className={styles.title}>{title}</h2>
        {demo && <Badge tone="warning">{fr.demo.badge}</Badge>}
      </div>
      <p className={styles.subtitle}>{subtitle}</p>
      {period && <p className={styles.period}>{period}</p>}
      {children}
    </li>
  );
}
