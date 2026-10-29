import { Container } from '../../../components/ui';
import { articles } from '../../../data/demo';
import { usePageMeta } from '../../../hooks/usePageMeta';
import { fr } from '../../../i18n/fr';
import { ArticleCard } from '../components/ArticleCard';
import { DemoNotice } from '../components/DemoNotice';
import { PageHeader } from '../components/PageHeader';
import s from '../public.module.css';

const publishedArticles = articles
  .filter((article) => article.status === 'published')
  .sort((a, b) => b.date.localeCompare(a.date));

export function NewsPage() {
  usePageMeta(fr.pages.news.title, fr.pages.news.description);

  return (
    <Container className={s.page}>
      <PageHeader title={fr.pages.news.title} intro={fr.pages.news.intro} />
      <DemoNotice />

      <ul className={s.grid}>
        {publishedArticles.map((article) => (
          <li key={article.slug}>
            <ArticleCard article={article} />
          </li>
        ))}
      </ul>
    </Container>
  );
}
