import { Badge, Card, Container } from '../../../components/ui';
import { skillCategories, skills } from '../../../data/demo';
import type { SkillLevel } from '../../../data/types';
import { usePageMeta } from '../../../hooks/usePageMeta';
import { fr } from '../../../i18n/fr';
import { DemoNotice } from '../components/DemoNotice';
import { PageHeader } from '../components/PageHeader';
import s from '../public.module.css';

const LEVEL_LABELS: Record<SkillLevel, string> = {
  notions: 'Notions',
  intermediaire: 'Intermédiaire',
  avance: 'Avancé',
};

export function SkillsPage() {
  usePageMeta(fr.pages.skills.title, fr.pages.skills.description);
  const visibleSkills = skills.filter((skill) => skill.visible);

  return (
    <Container className={s.page}>
      <PageHeader title={fr.pages.skills.title} intro={fr.pages.skills.intro} />
      <DemoNotice />

      {skillCategories.map((category, index) => {
        const items = visibleSkills
          .filter((skill) => skill.category === category)
          .sort((a, b) => a.order - b.order);
        if (items.length === 0) return null;
        const headingId = `competences-${index}`;

        return (
          <section key={category} aria-labelledby={headingId} className={s.stack}>
            <h2 id={headingId}>{category}</h2>
            <ul className={`${s.grid} ${s.grid3}`}>
              {items.map((skill) => (
                <li key={skill.name}>
                  <Card>
                    <div className={s.row}>
                      <strong>{skill.name}</strong>
                      {skill.level && <Badge>{LEVEL_LABELS[skill.level]}</Badge>}
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </Container>
  );
}
