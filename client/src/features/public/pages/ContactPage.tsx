import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  Badge,
  Button,
  Container,
  ExternalAnchor,
  TextAreaField,
  TextField,
} from '../../../components/ui';
import { site } from '../../../data/site';
import { usePageMeta } from '../../../hooks/usePageMeta';
import { fr } from '../../../i18n/fr';
import {
  CONTACT_LIMITS,
  validateContactForm,
  type ContactErrors,
  type ContactValues,
} from '../../../lib/contact';
import { PageHeader } from '../components/PageHeader';
import s from '../public.module.css';
import styles from './ContactPage.module.css';

const EMPTY_VALUES: ContactValues = { name: '', email: '', subject: '', message: '' };
const FIELD_NAMES: ReadonlyArray<keyof ContactValues> = ['name', 'email', 'subject', 'message'];

type SendStatus = 'idle' | 'sending' | 'sent' | 'error';

/** Lit les erreurs par champ renvoyées par le serveur (réponse 400). */
async function readServerFieldErrors(response: Response): Promise<ContactErrors> {
  try {
    const body = (await response.json()) as { error?: { fields?: Record<string, string> } };
    const errors: ContactErrors = {};
    for (const field of FIELD_NAMES) {
      const message = body.error?.fields?.[field];
      if (typeof message === 'string') errors[field] = message;
    }
    return errors;
  } catch {
    return {};
  }
}

export function ContactPage() {
  usePageMeta(fr.pages.contact.title, fr.pages.contact.description);
  const [values, setValues] = useState<ContactValues>(EMPTY_VALUES);
  const [errors, setErrors] = useState<ContactErrors>({});
  const [status, setStatus] = useState<SendStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Champ piège : invisible pour les humains, rempli seulement par les robots.
  const [trap, setTrap] = useState('');

  const update =
    (field: keyof ContactValues) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { value } = event.target;
      setValues((current) => ({ ...current, [field]: value }));
    };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === 'sending') return;

    const found = validateContactForm(values);
    setErrors(found);
    setErrorMessage(null);
    if (Object.keys(found).length > 0) {
      setStatus('idle');
      return;
    }

    setStatus('sending');
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.name.trim(),
          email: values.email.trim(),
          subject: values.subject.trim(),
          message: values.message.trim(),
          website: trap,
        }),
      });

      if (response.status === 201) {
        setValues(EMPTY_VALUES);
        setStatus('sent');
        return;
      }

      setStatus('error');
      if (response.status === 429) {
        setErrorMessage('Trop de messages envoyés depuis cette connexion. Réessayez plus tard.');
      } else if (response.status === 400) {
        setErrors(await readServerFieldErrors(response));
        setErrorMessage('Certains champs sont invalides. Corrigez-les puis réessayez.');
      } else {
        setErrorMessage('Votre message n’a pas pu être envoyé. Réessayez dans quelques instants.');
      }
    } catch {
      setStatus('error');
      setErrorMessage('Impossible de joindre le serveur. Vérifiez votre connexion puis réessayez.');
    }
  }

  return (
    <Container className={s.page}>
      <PageHeader title={fr.pages.contact.title} intro={fr.pages.contact.intro} />

      <div className={styles.layout}>
        <form
          className={styles.form}
          onSubmit={(event) => {
            void handleSubmit(event);
          }}
          noValidate
        >
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

          {/* Champ piège : hors de l'écran, ignoré des lecteurs d'écran et du clavier. */}
          <div className={styles.trap} aria-hidden="true">
            <label>
              Ne remplissez pas ce champ
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                value={trap}
                onChange={(event) => setTrap(event.target.value)}
              />
            </label>
          </div>

          <p className={styles.privacy}>
            Ces informations servent uniquement à vous répondre. Voir la{' '}
            <Link to="/confidentialite">politique de confidentialité</Link>.
          </p>

          <div>
            <Button type="submit" loading={status === 'sending'}>
              Envoyer le message
            </Button>
          </div>

          <div role="status">
            {status === 'sent' && (
              <p className={styles.feedback}>
                <Badge tone="success">Envoyé</Badge>
                <span>
                  Merci, votre message a bien été envoyé. Je vous répondrai dès que possible.
                </span>
              </p>
            )}
            {status === 'error' && errorMessage && (
              <p className={styles.feedback}>
                <Badge tone="danger">Erreur</Badge>
                <span>{errorMessage}</span>
              </p>
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
