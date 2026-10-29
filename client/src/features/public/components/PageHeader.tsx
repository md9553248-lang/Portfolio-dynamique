import styles from './PageHeader.module.css';

interface PageHeaderProps {
  title: string;
  intro?: string;
}

export function PageHeader({ title, intro }: PageHeaderProps) {
  return (
    <header className={styles.header}>
      <h1 className={styles.title}>{title}</h1>
      {intro && <p className={styles.intro}>{intro}</p>}
    </header>
  );
}
