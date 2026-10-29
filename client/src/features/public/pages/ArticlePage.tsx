import { ArrowLeft, Calendar } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { Badge, Button, Container } from '../../../components/ui';
import { articles } from '../../../data/demo';
import { usePageMeta } from '../../../hooks/usePageMeta';
import { fr } from '../../../i18n/fr';
import { formatDate } from '../../../lib/format';
import { DemoNotice } from '../components/DemoNotice';
import s from '../public.module.css';
import { NotFoundPage } from './NotFoundPage';

export function ArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const article = articles.find((item) => item.slug === slug && item.status === 'published');

  usePageMeta(article?.title ?? fr.pages.notFound.title, article?.excerpt);

  if (!article) return <NotFoundPage />;

  return (
    <Container size="narrow" className={s.page}>
      <Button href="/actualites" variant="ghost" size="sm" className={s.back}>
        <ArrowLeft size={16} aria-hidden="true" />
        Toutes les actualités
      </Button>

      <article className={s.stack}>
        <header className={s.stack}>
          <div className={s.row}>
            {article.demo && <Badge tone="warning">{fr.demo.badge}</Badge>}
            <Badge>{article.category}</Badge>
          </div>
          <h1 className={s.pageTitle}>{article.title}</h1>
          <p className={s.meta}>
            <span>
              <Calendar size={16} aria-hidden="true" />
              <time dateTime={article.date}>{formatDate(article.date)}</time>
            </span>
          </p>
        </header>

        {article.demo && <DemoNotice />}

        <div className={s.prose}>
          {article.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </article>
    </Container>
  );
}
