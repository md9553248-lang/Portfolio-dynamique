import { useState } from 'react';
import { Button, Container } from '../../../components/ui';
import { projects } from '../../../data/demo';
import { usePageMeta } from '../../../hooks/usePageMeta';
import { fr } from '../../../i18n/fr';
import { DemoNotice } from '../components/DemoNotice';
import { PageHeader } from '../components/PageHeader';
import { ProjectCard } from '../components/ProjectCard';
import s from '../public.module.css';

const publishedProjects = projects.filter((project) => project.status === 'published');
const categories = [...new Set(publishedProjects.map((project) => project.category))];

export function ProjectsPage() {
  usePageMeta(fr.pages.projects.title, fr.pages.projects.description);
  const [category, setCategory] = useState<string | null>(null);

  const shown = category
    ? publishedProjects.filter((project) => project.category === category)
    : publishedProjects;
  const countLabel = `${shown.length} ${shown.length > 1 ? 'projets affichés' : 'projet affiché'}`;

  return (
    <Container className={s.page}>
      <PageHeader title={fr.pages.projects.title} intro={fr.pages.projects.intro} />
      <DemoNotice />

      <div className={s.stack}>
        <div className={s.row} role="group" aria-label="Filtrer par catégorie">
          <Button
            size="sm"
            variant={category === null ? 'primary' : 'secondary'}
            aria-pressed={category === null}
            onClick={() => setCategory(null)}
          >
            Tous
          </Button>
          {categories.map((name) => (
            <Button
              key={name}
              size="sm"
              variant={category === name ? 'primary' : 'secondary'}
              aria-pressed={category === name}
              onClick={() => setCategory(name)}
            >
              {name}
            </Button>
          ))}
        </div>
        <p role="status" className={s.muted}>
          {countLabel}
        </p>
      </div>

      <ul className={`${s.grid} ${s.grid3}`}>
        {shown.map((project) => (
          <li key={project.slug}>
            <ProjectCard project={project} />
          </li>
        ))}
      </ul>
    </Container>
  );
}
