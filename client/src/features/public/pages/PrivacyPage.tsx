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
        Texte provisoire : il doit être finalisé et relu avant l’activation du formulaire de
        contact.
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
          Le formulaire de contact demande un nom, une adresse e-mail, un sujet et un message. À ce
          jour, le formulaire n’est pas actif : aucune donnée n’est envoyée ni enregistrée.
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
        <p>Elle sera précisée ici avant l’activation du formulaire.</p>
      </section>

      <section aria-labelledby="droits" className={s.stack}>
        <h2 id="droits">Vos droits</h2>
        <p>
          Vous pourrez demander l’accès, la correction ou la suppression de vos données en
          m’écrivant via la page <Link to="/contact">Contact</Link>.
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
