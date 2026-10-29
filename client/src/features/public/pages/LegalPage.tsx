import { Link } from 'react-router-dom';
import { Container } from '../../../components/ui';
import { site } from '../../../data/site';
import { usePageMeta } from '../../../hooks/usePageMeta';
import { fr } from '../../../i18n/fr';
import { DemoNotice } from '../components/DemoNotice';
import { PageHeader } from '../components/PageHeader';
import s from '../public.module.css';

export function LegalPage() {
  usePageMeta(fr.pages.legal.title, fr.pages.legal.description);

  return (
    <Container size="narrow" className={s.page}>
      <PageHeader title={fr.pages.legal.title} />
      <DemoNotice>
        Texte provisoire : il doit être complété (hébergeur notamment) et relu avant la mise en ligne.
      </DemoNotice>

      <section aria-labelledby="editeur" className={s.stack}>
        <h2 id="editeur">Éditeur du site</h2>
        <p>
          {site.name}, étudiant, Sénégal. Pour me joindre : <Link to="/contact">page Contact</Link>.
        </p>
      </section>

      <section aria-labelledby="hebergement" className={s.stack}>
        <h2 id="hebergement">Hébergement</h2>
        <p>L’hébergeur sera indiqué ici lors de la mise en ligne du site.</p>
      </section>

      <section aria-labelledby="propriete" className={s.stack}>
        <h2 id="propriete">Propriété intellectuelle</h2>
        <p>
          Sauf mention contraire, les textes, visuels et le code de ce site sont l’œuvre de {site.name}.
        </p>
      </section>

      <section aria-labelledby="responsabilite" className={s.stack}>
        <h2 id="responsabilite">Responsabilité</h2>
        <p>
          Les informations de ce site sont données à titre indicatif. Les liens vers d’autres sites
          n’engagent pas leurs éditeurs ni cet éditeur.
        </p>
      </section>
    </Container>
  );
}
