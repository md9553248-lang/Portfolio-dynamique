import { Badge, Container } from '../../../components/ui';
import { education } from '../../../data/demo';
import { usePageMeta } from '../../../hooks/usePageMeta';
import { fr } from '../../../i18n/fr';
import { DemoNotice } from '../components/DemoNotice';
import { PageHeader } from '../components/PageHeader';
import { Timeline, TimelineItem } from '../components/Timeline';
import s from '../public.module.css';

export function EducationPage() {
  usePageMeta(fr.pages.education.title, fr.pages.education.description);
  const hasDemo = education.some((item) => item.demo);

  return (
    <Container className={s.page}>
      <PageHeader title={fr.pages.education.title} intro={fr.pages.education.intro} />
      {hasDemo && <DemoNotice />}

      <Timeline>
        {education.map((item) => (
          <TimelineItem key={item.id} title={item.degree} subtitle={item.institution} demo={item.demo}>
            <div>
              <Badge tone="accent">{item.status}</Badge>
            </div>
            <p>{item.description}</p>
          </TimelineItem>
        ))}
      </Timeline>
    </Container>
  );
}
