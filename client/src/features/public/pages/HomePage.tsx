import { ArrowRight } from 'lucide-react';
import { Badge, Button, Card, Container, ExternalAnchor, LightStreak, Section } from '../../../components/ui';
import { experiences, projects, skills } from '../../../data/demo';
import { site } from '../../../data/site';
import { usePageMeta } from '../../../hooks/usePageMeta';
import { fr } from '../../../i18n/fr';
import { formatPeriod } from '../../../lib/format';
import { CvDownload } from '../components/CvDownload';
import { DemoNotice } from '../components/DemoNotice';
import { Portrait } from '../components/Portrait';
import { ProjectCard } from '../components/ProjectCard';
import s from '../public.module.css';
import styles from './HomePage.module.css';

const featuredProjects = projects.filter((p) => p.status === 'published' && p.featured).slice(0, 3);
const mainSkills = skills
  .filter((skill) => skill.visible)
  .sort((a, b) => a.order - b.order)
  .slice(0, 8);
const latestExperience = experiences[0];

export function HomePage() {
  usePageMeta(null, fr.pages.home.description);

  return (
    <>
      <Container className={styles.hero}>
        <div className={styles.heroText}>
          <p className={styles.context}>{site.context}</p>
          <h1 className={styles.name}>{site.name}</h1>
          <p className={styles.role}>{site.title}</p>
          <p className={styles.lead}>{site.intro}</p>
          <div className={styles.actions}>
            <Button href="/projets" size="lg">
              Voir mes projets
              <ArrowRight size={18} aria-hidden="true" />
            </Button>
            <Button href="/contact" variant="secondary" size="lg">
              Me contacter
            </Button>
            <CvDownload />
          </div>
        </div>
        <Portrait />
      </Container>

      <LightStreak />

      <Container className={styles.notice}>
        <DemoNotice />
      </Container>

      <Section id="competences" title="Compétences principales">
        <ul className={s.row} aria-label="Compétences principales">
          {mainSkills.map((skill) => (
            <li key={skill.name}>
              <Badge tone="accent">{skill.name}</Badge>
            </li>
          ))}
        </ul>
        <div className={styles.more}>
          <Button href="/competences" variant="ghost">
            Toutes les compétences
            <ArrowRight size={16} aria-hidden="true" />
          </Button>
        </div>
      </Section>

      <Section id="projets" title="Projets mis en avant" description="Une sélection de mes réalisations.">
        <ul className={`${s.grid} ${s.grid3}`}>
          {featuredProjects.map((project) => (
            <li key={project.slug}>
              <ProjectCard project={project} />
            </li>
          ))}
        </ul>
        <div className={styles.more}>
          <Button href="/projets" variant="ghost">
            Tous les projets
            <ArrowRight size={16} aria-hidden="true" />
          </Button>
        </div>
      </Section>

      {latestExperience && (
        <Section id="experience" title="Expérience récente">
          <Card as="article">
            <div className={s.row}>
              <h3>{latestExperience.role}</h3>
              {latestExperience.demo && <Badge tone="warning">{fr.demo.badge}</Badge>}
            </div>
            <p className={s.muted}>
              {latestExperience.organization} · {formatPeriod(latestExperience.start, latestExperience.end)}
            </p>
            <p className={styles.cardText}>{latestExperience.description}</p>
          </Card>
        </Section>
      )}

      <Section id="travaillons-ensemble" title="Travaillons ensemble">
        <div className={s.stack}>
          <p className={s.muted}>
            Une opportunité, un stage, un projet à construire ? Je serai heureux d’en discuter.
          </p>
          <div className={s.row}>
            <Button href="/contact">Me contacter</Button>
            {site.social.map((link) => (
              <ExternalAnchor key={link.href} href={link.href}>
                {link.label}
              </ExternalAnchor>
            ))}
          </div>
        </div>
      </Section>
    </>
  );
}
