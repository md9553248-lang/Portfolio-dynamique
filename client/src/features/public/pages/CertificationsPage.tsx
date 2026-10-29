import { Badge, Card, Container, ExternalAnchor } from '../../../components/ui';
import { certifications } from '../../../data/demo';
import { usePageMeta } from '../../../hooks/usePageMeta';
import { fr } from '../../../i18n/fr';
import { formatMonthYear } from '../../../lib/format';
import { DemoNotice } from '../components/DemoNotice';
import { PageHeader } from '../components/PageHeader';
import s from '../public.module.css';

export function CertificationsPage() {
  usePageMeta(fr.pages.certifications.title, fr.pages.certifications.description);

  return (
    <Container className={s.page}>
      <PageHeader title={fr.pages.certifications.title} intro={fr.pages.certifications.intro} />
      <DemoNotice />

      <ul className={s.grid}>
        {certifications.map((certification) => (
          <li key={certification.id}>
            <Card as="article">
              <div className={s.stack}>
                <div className={s.row}>
                  <h2 className={s.cardTitle}>{certification.name}</h2>
                  {certification.demo && <Badge tone="warning">{fr.demo.badge}</Badge>}
                </div>
                <p>{certification.issuer}</p>
                <div className={s.meta}>
                  <span>Obtenue en {formatMonthYear(certification.issuedAt)}</span>
                  {certification.expiresAt && (
                    <span>Expire en {formatMonthYear(certification.expiresAt)}</span>
                  )}
                  {certification.credentialId && <span>Identifiant : {certification.credentialId}</span>}
                </div>
                {certification.verifyUrl && (
                  <ExternalAnchor href={certification.verifyUrl}>Vérifier la certification</ExternalAnchor>
                )}
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </Container>
  );
}
