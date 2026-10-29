import { ArrowLeft, Calendar } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { Badge, Button, Card, CinemaFrame, Container, ExternalAnchor } from '../../../components/ui';
import { projects } from '../../../data/demo';
import { usePageMeta } from '../../../hooks/usePageMeta';
import { fr } from '../../../i18n/fr';
import { formatMonthYear } from '../../../lib/format';
import { DemoNotice } from '../components/DemoNotice';
import s from '../public.module.css';
import styles from './ProjectDetailPage.module.css';
import { NotFoundPage } from './NotFoundPage';

export function ProjectDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const project = projects.find((item) => item.slug === slug && item.status === 'published');

  usePageMeta(project?.title ?? fr.pages.notFound.title, project?.shortDescription);

  if (!project) return <NotFoundPage />;

  const cover = project.gallery?.[0];

  return (
    <Container className={s.page}>
      <Button href="/projets" variant="ghost" size="sm" className={s.back}>
        <ArrowLeft size={16} aria-hidden="true" />
        Tous les projets
      </Button>

      <header className={s.stack}>
        <div className={s.row}>
          {project.demo && <Badge tone="warning">{fr.demo.badge}</Badge>}
          <Badge>{project.category}</Badge>
        </div>
        <h1 className={styles.title}>{project.title}</h1>
        <p className={styles.lead}>{project.shortDescription}</p>
        <div className={s.meta}>
          <span>
            <Calendar size={16} aria-hidden="true" />
            <time dateTime={project.date}>{formatMonthYear(project.date)}</time>
          </span>
          <span>Rôle : {project.role}</span>
        </div>
      </header>

      {project.demo && <DemoNotice />}

      <CinemaFrame>
        {cover ? (
          <img src={cover.src} alt={cover.alt} />
        ) : (
          <div className={styles.cover} aria-hidden="true">
            {project.category}
          </div>
        )}
      </CinemaFrame>

      <section aria-labelledby="presentation" className={s.stack}>
        <h2 id="presentation">Présentation</h2>
        <div className={s.prose}>
          {project.description.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </section>

      <section aria-labelledby="technologies" className={s.stack}>
        <h2 id="technologies">Technologies utilisées</h2>
        <ul className={s.row}>
          {project.technologies.map((tech) => (
            <li key={tech}>
              <Badge tone="accent">{tech}</Badge>
            </li>
          ))}
        </ul>
      </section>

      {project.challenges.length > 0 && (
        <section aria-labelledby="difficultes" className={s.stack}>
          <h2 id="difficultes">Difficultés et solutions</h2>
          <ul className={s.grid}>
            {project.challenges.map((challenge) => (
              <li key={challenge.problem}>
                <Card>
                  <dl className={s.stack}>
                    <div>
                      <dt className={styles.term}>Difficulté</dt>
                      <dd>{challenge.problem}</dd>
                    </div>
                    <div>
                      <dt className={styles.term}>Solution</dt>
                      <dd>{challenge.solution}</dd>
                    </div>
                  </dl>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}

      {project.gallery && project.gallery.length > 0 && (
        <section aria-labelledby="galerie" className={s.stack}>
          <h2 id="galerie">Galerie</h2>
          <ul className={`${s.grid} ${s.grid3}`}>
            {project.gallery.map((image) => (
              <li key={image.src}>
                <CinemaFrame ratio="wide">
                  <img src={image.src} alt={image.alt} loading="lazy" />
                </CinemaFrame>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(project.githubUrl || project.demoUrl) && (
        <section aria-labelledby="liens" className={s.stack}>
          <h2 id="liens">Liens</h2>
          <div className={s.row}>
            {project.githubUrl && <ExternalAnchor href={project.githubUrl}>Code sur GitHub</ExternalAnchor>}
            {project.demoUrl && <ExternalAnchor href={project.demoUrl}>Démonstration en ligne</ExternalAnchor>}
          </div>
        </section>
      )}
    </Container>
  );
}
