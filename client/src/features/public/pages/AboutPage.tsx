import { Link } from 'react-router-dom';
import { Container } from '../../../components/ui';
import { education } from '../../../data/demo';
import { site } from '../../../data/site';
import { usePageMeta } from '../../../hooks/usePageMeta';
import { fr } from '../../../i18n/fr';
import { DemoNotice } from '../components/DemoNotice';
import { PageHeader } from '../components/PageHeader';
import { Portrait } from '../components/Portrait';
import s from '../public.module.css';
import styles from './AboutPage.module.css';

export function AboutPage() {
  usePageMeta(fr.pages.about.title, fr.pages.about.description);
  const current = education[0];

  return (
    <Container className={s.page}>
      <PageHeader
        title={fr.pages.about.title}
        intro={`${site.name}, ${site.title.toLowerCase()}`}
      />
      <DemoNotice>
        Texte de présentation provisoire : il sera réécrit avec mes propres mots depuis
        l’administration.
      </DemoNotice>

      <div className={styles.layout}>
        <div className={s.prose}>
          {site.about.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <Portrait />
      </div>

      <section aria-labelledby="parcours" className={s.stack}>
        <h2 id="parcours">Parcours</h2>
        {current && (
          <p>
            {current.degree}, {current.institution}. {current.status}.{' '}
            <Link to="/formations">Voir mes formations</Link>
          </p>
        )}
      </section>

      <section aria-labelledby="objectifs" className={s.stack}>
        <h2 id="objectifs">Objectifs</h2>
        <ul className={s.bullets}>
          {site.objectives.map((objective) => (
            <li key={objective}>{objective}</li>
          ))}
        </ul>
      </section>
    </Container>
  );
}
