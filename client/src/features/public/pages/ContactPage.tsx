import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button, Container, ExternalAnchor, TextAreaField, TextField } from '../../../components/ui';
import { site } from '../../../data/site';
import { usePageMeta } from '../../../hooks/usePageMeta';
import { fr } from '../../../i18n/fr';
import {
  CONTACT_LIMITS,
  validateContactForm,
  type ContactErrors,
  type ContactValues,
} from '../../../lib/contact';
import { DemoNotice } from '../components/DemoNotice';
import { PageHeader } from '../components/PageHeader';
import s from '../public.module.css';
import styles from './ContactPage.module.css';

const EMPTY_VALUES: ContactValues = { name: '', email: '', subject: '', message: '' };

export function ContactPage() {
  usePageMeta(fr.pages.contact.title, fr.pages.contact.description);
  const [values, setValues] = useState<ContactValues>(EMPTY_VALUES);
  const [errors, setErrors] = useState<ContactErrors>({});
  const [validated, setValidated] = useState(false);

  const update =
    (field: keyof ContactValues) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { value } = event.target;
      setValues((current) => ({ ...current, [field]: value }));
    };

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validateContactForm(values);
    setErrors(found);
    setValidated(Object.keys(found).length === 0);
  }

  return (
    <Container className={s.page}>
      <PageHeader title={fr.pages.contact.title} intro={fr.pages.contact.intro} />

      <div className={styles.layout}>
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <TextField
            label="Nom"
            name="name"
            autoComplete="name"
            required
            maxLength={CONTACT_LIMITS.name}
            value={values.name}
            onChange={update('name')}
            error={errors.name}
          />
          <TextField
            label="Adresse e-mail"
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={CONTACT_LIMITS.email}
            value={values.email}
            onChange={update('email')}
            error={errors.email}
          />
          <TextField
            label="Sujet"
            name="subject"
            required
            maxLength={CONTACT_LIMITS.subject}
            value={values.subject}
            onChange={update('subject')}
            error={errors.subject}
          />
          <TextAreaField
            label="Message"
            name="message"
            required
            maxLength={CONTACT_LIMITS.message}
            value={values.message}
            onChange={update('message')}
            error={errors.message}
          />

          <p className={styles.privacy}>
            Ces informations servent uniquement à vous répondre. Voir la{' '}
            <Link to="/confidentialite">politique de confidentialité</Link>.
          </p>

          <div>
            <Button type="submit">Envoyer le message</Button>
          </div>

          <div role="status">
            {validated && (
              <DemoNotice>
                Mode démonstration : le formulaire est valide, mais votre message n’a pas été envoyé car
                le serveur de messagerie n’est pas encore connecté.
              </DemoNotice>
            )}
          </div>
        </form>

        <aside className={s.stack} aria-label="Autres moyens de me contacter">
          <h2>Autres moyens</h2>
          <ul className={s.row}>
            {site.social.map((link) => (
              <li key={link.href}>
                <ExternalAnchor href={link.href}>{link.label}</ExternalAnchor>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </Container>
  );
}
