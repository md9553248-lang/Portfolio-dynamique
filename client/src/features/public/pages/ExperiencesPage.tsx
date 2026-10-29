import { Badge, Container } from '../../../components/ui';
import { experiences } from '../../../data/demo';
import { usePageMeta } from '../../../hooks/usePageMeta';
import { fr } from '../../../i18n/fr';
import { formatPeriod } from '../../../lib/format';
import { DemoNotice } from '../components/DemoNotice';
import { PageHeader } from '../components/PageHeader';
import { Timeline, TimelineItem } from '../components/Timeline';
import s from '../public.module.css';

export function ExperiencesPage() {
  usePageMeta(fr.pages.experiences.title, fr.pages.experiences.description);

  return (
    <Container className={s.page}>
      <PageHeader title={fr.pages.experiences.title} intro={fr.pages.experiences.intro} />
      <DemoNotice />

      <Timeline>
        {experiences.map((experience) => (
          <TimelineItem
            key={experience.id}
            title={experience.role}
            subtitle={experience.organization}
            period={formatPeriod(experience.start, experience.end)}
            demo={experience.demo}
          >
            <p>{experience.description}</p>
            <ul className={s.bullets}>
              {experience.missions.map((mission) => (
                <li key={mission}>{mission}</li>
              ))}
            </ul>
            <ul className={s.row} aria-label="Technologies utilisées">
              {experience.technologies.map((tech) => (
                <li key={tech}>
                  <Badge tone="accent">{tech}</Badge>
                </li>
              ))}
            </ul>
          </TimelineItem>
        ))}
      </Timeline>
    </Container>
  );
}
