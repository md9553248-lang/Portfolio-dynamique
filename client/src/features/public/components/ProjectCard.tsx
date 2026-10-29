import { Link } from 'react-router-dom';
import { Badge, Card, CinemaFrame } from '../../../components/ui';
import type { Project } from '../../../data/types';
import { fr } from '../../../i18n/fr';
import styles from './ProjectCard.module.css';

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Card as="article" interactive className={styles.card}>
      <CinemaFrame>
        <div className={styles.cover} aria-hidden="true">
          {project.category}
        </div>
      </CinemaFrame>
      <div className={styles.body}>
        <div className={styles.badges}>
          {project.demo && <Badge tone="warning">{fr.demo.badge}</Badge>}
          <Badge>{project.category}</Badge>
        </div>
        <h3>
          <Link to={`/projets/${project.slug}`} className={styles.link}>
            {project.title}
          </Link>
        </h3>
        <p className={styles.description}>{project.shortDescription}</p>
        <ul className={styles.tech} aria-label="Technologies utilisées">
          {project.technologies.map((tech) => (
            <li key={tech}>
              <Badge tone="accent">{tech}</Badge>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
