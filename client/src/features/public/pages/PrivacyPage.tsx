import { Link } from 'react-router-dom';
import { Container } from '../../../components/ui';
import { usePageMeta } from '../../../hooks/usePageMeta';
import { fr } from '../../../i18n/fr';
import { DemoNotice } from '../components/DemoNotice';
import { PageHeader } from '../components/PageHeader';
import s from '../public.module.css';

export function PrivacyPage() {
  usePageMeta(fr.pages.privacy.title, fr.pages.privacy.description);

  return (
    <Container size="narrow" className={s.page}>
      <PageHeader title={fr.pages.privacy.title} />
      <DemoNotice>
        Texte provisoire : il doit être finalisé et relu avant la mise en ligne du site.
      </DemoNotice>

      <section aria-labelledby="responsable" className={s.stack}>
        <h2 id="responsable">Responsable du site</h2>
        <p>
          Ce site est édité par Mouhamed Diagne, qui décide des données collectées et de leur usage.
        </p>
      </section>

      <section aria-labelledby="donnees" className={s.stack}>
        <h2 id="donnees">Données collectées</h2>
        <p>
          Le formulaire de contact demande un nom, une adresse e-mail, un sujet et un message. Quand
          vous l’envoyez, ces informations sont enregistrées dans la base de données du site et ne
          sont consultables que par son propriétaire.
        </p>
        <p>
          Pour limiter les abus (envois automatiques), une empreinte non réversible de votre adresse
          IP est aussi conservée : l’adresse IP elle-même n’est pas enregistrée.
        </p>
      </section>

      <section aria-labelledby="finalite" className={s.stack}>
        <h2 id="finalite">Pourquoi ces données</h2>
        <p>
          Elles servent uniquement à lire votre message et à vous répondre. Elles ne sont pas
          vendues.
        </p>
      </section>

      <section aria-labelledby="conservation" className={s.stack}>
        <h2 id="conservation">Durée de conservation</h2>
        <p>La durée exacte sera précisée ici avant la mise en ligne du site.</p>
      </section>

      <section aria-labelledby="droits" className={s.stack}>
        <h2 id="droits">Vos droits</h2>
        <p>
          Vous pouvez demander l’accès, la correction ou la suppression de vos données en m’écrivant
          via la page <Link to="/contact">Contact</Link>.
        </p>
      </section>

      <section aria-labelledby="stockage" className={s.stack}>
        <h2 id="stockage">Cookies et stockage local</h2>
        <p>
          Le site n’utilise aucun cookie de suivi et aucun outil d’analyse. Il mémorise seulement
          votre choix de thème (clair ou sombre) dans le stockage local de votre navigateur.
        </p>
      </section>
    </Container>
  );
}
