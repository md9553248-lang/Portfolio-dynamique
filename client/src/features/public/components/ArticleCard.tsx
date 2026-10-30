import { Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge, Card } from '../../../components/ui';
import type { Article } from '../../../data/types';
import { fr } from '../../../i18n/fr';
import { formatDate } from '../../../lib/format';
import styles from './ProjectCard.module.css';

export function ArticleCard({ article }: { article: Article }) {
  return (
    <Card as="article" interactive className={styles.card}>
      <div className={styles.body}>
        <div className={styles.badges}>
          {article.demo && <Badge tone="warning">{fr.demo.badge}</Badge>}
          <Badge>{article.category}</Badge>
        </div>
        <h3>
          <Link to={`/actualites/${article.slug}`} className={styles.link}>
            {article.title}
          </Link>
        </h3>
        <p className={styles.description}>{article.excerpt}</p>
        <p className={styles.description}>
          <Calendar
            size={16}
            aria-hidden="true"
            style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: '-0.15em' }}
          />
          <time dateTime={article.date}>{formatDate(article.date)}</time>
        </p>
      </div>
    </Card>
  );
}
