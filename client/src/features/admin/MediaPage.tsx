import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Badge, Button, Card, Spinner, TextField } from '../../components/ui';
import { usePageMeta } from '../../hooks/usePageMeta';
import { AdminApiError } from '../../lib/adminApi';
import { formatBytes } from '../../lib/format';
import { uploadFile } from '../../lib/upload';
import { ConfirmButton } from './ConfirmButton';
import { useAdminApi } from './useAdminApi';
import { useAdminResource } from './useAdminResource';
import styles from './pages.module.css';

interface MediaItem {
  id: number;
  url: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  visibility: 'public' | 'private';
  altText: string | null;
  kind: 'image' | 'document';
}

type Notice = { tone: 'success' | 'error'; text: string };
type Visibility = '' | 'public' | 'private';

function describeError(error: unknown): string {
  if (!(error instanceof AdminApiError)) return 'L’action a échoué.';
  if (error.code === 'MEDIA_IN_USE') {
    const usages = (error.details as { usages?: Array<{ where: string; label: string }> } | undefined)?.usages ?? [];
    const where = usages.map((usage) => `${usage.where} (${usage.label})`).join(', ');
    return `Suppression impossible : ce fichier est utilisé par ${where}. Retirez-le d’abord de ces contenus.`;
  }
  return error.message;
}

export function MediaPage() {
  usePageMeta('Médias');
  const resource = useAdminResource<MediaItem[]>('/api/admin/media');
  const { getCsrfToken, handleError } = useAdminApi();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [altText, setAltText] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('');
  const [progress, setProgress] = useState<number | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (progress !== null) return;
    if (!file) {
      setNotice({ tone: 'error', text: 'Choisissez d’abord un fichier.' });
      return;
    }
    setNotice(null);
    setProgress(0);
    try {
      await uploadFile({
        url: '/api/admin/media',
        file,
        csrfToken: getCsrfToken(),
        onProgress: setProgress,
        fields: { ...(altText.trim() ? { altText: altText.trim() } : {}), ...(visibility ? { visibility } : {}) },
      });
      setNotice({ tone: 'success', text: 'Fichier importé.' });
      setFile(null);
      setAltText('');
      if (inputRef.current) inputRef.current.value = '';
      resource.reload();
    } catch (error) {
      handleError(error);
      setNotice({ tone: 'error', text: describeError(error) });
    } finally {
      setProgress(null);
    }
  }

  const items = resource.data;

  return (
    <div className={styles.page}>
      <h1>Médias</h1>

      <div aria-live="polite">
        {notice && (
          <p role={notice.tone === 'error' ? 'alert' : 'status'} className={notice.tone === 'error' ? styles.error : styles.success}>
            {notice.text}
          </p>
        )}
      </div>

      <section aria-labelledby="media-import" className={styles.section}>
        <h2 id="media-import">Importer un fichier</h2>
        <form
          className={styles.uploadForm}
          onSubmit={(event) => {
            void handleUpload(event);
          }}
          noValidate
        >
          <label className={styles.section}>
            <span>Image (JPEG, PNG, WebP, AVIF) ou PDF</span>
            <input
              ref={inputRef}
              className={styles.fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif,application/pdf"
              disabled={progress !== null}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setFile(event.target.files?.[0] ?? null)}
            />
          </label>
          <TextField
            label="Texte alternatif (décrit l’image pour les lecteurs d’écran)"
            name="altText"
            value={altText}
            maxLength={255}
            onChange={(event) => setAltText(event.target.value)}
          />
          <label className={styles.section}>
            <span>Visibilité</span>
            <select
              className={styles.select}
              value={visibility}
              onChange={(event) => setVisibility(event.target.value as Visibility)}
            >
              <option value="">Automatique (images publiques, PDF privés)</option>
              <option value="public">Public</option>
              <option value="private">Privé</option>
            </select>
          </label>
          {progress !== null && (
            <div className={styles.section}>
              <progress className={styles.progress} max={100} value={progress} aria-label="Progression de l’envoi" />
              <span className={styles.muted}>Envoi en cours : {progress} %</span>
            </div>
          )}
          <div>
            <Button type="submit" loading={progress !== null}>
              Importer
            </Button>
          </div>
        </form>
      </section>

      <section aria-labelledby="media-liste" className={styles.section}>
        <h2 id="media-liste">Fichiers</h2>
        {resource.status === 'loading' && !items && <Spinner label="Chargement des fichiers…" />}
        {resource.status === 'error' && (
          <p role="alert" className={styles.error}>
            {resource.error}
          </p>
        )}
        {items && items.length === 0 && <p className={styles.muted}>Aucun fichier pour le moment.</p>}
        {items && items.length > 0 && (
          <ul className={styles.list}>
            {items.map((item) => (
              <li key={item.id}>
                <MediaRow item={item} onChanged={resource.reload} notify={setNotice} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function MediaRow({ item, onChanged, notify }: { item: MediaItem; onChanged: () => void; notify: (notice: Notice) => void }) {
  const { request, getCsrfToken, handleError } = useAdminApi();
  const [alt, setAlt] = useState(item.altText ?? '');
  const [visibility, setVisibility] = useState(item.visibility);
  const [busy, setBusy] = useState<'save' | 'delete' | 'replace' | null>(null);

  async function run(kind: 'save' | 'delete' | 'replace', successText: string, action: () => Promise<unknown>) {
    setBusy(kind);
    try {
      await action();
      notify({ tone: 'success', text: successText });
      onChanged();
    } catch (error) {
      handleError(error);
      notify({ tone: 'error', text: describeError(error) });
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <div className={styles.mediaItem}>
        {item.kind === 'image' ? (
          <img className={styles.thumb} src={item.url} alt={item.altText || item.originalName} loading="lazy" />
        ) : (
          <div className={styles.thumbPlaceholder} aria-hidden="true">
            PDF
          </div>
        )}
        <div className={styles.mediaForm}>
          <div className={styles.row}>
            <strong>{item.originalName}</strong>
            <Badge tone={item.visibility === 'public' ? 'accent' : 'neutral'}>
              {item.visibility === 'public' ? 'Public' : 'Privé'}
            </Badge>
            <span className={styles.muted}>{formatBytes(item.sizeBytes)}</span>
          </div>

          <TextField
            label={`Texte alternatif (${item.originalName})`}
            name={`alt-${item.id}`}
            value={alt}
            maxLength={255}
            onChange={(event) => setAlt(event.target.value)}
          />
          <label className={styles.section}>
            <span>Visibilité ({item.originalName})</span>
            <select
              className={styles.select}
              value={visibility}
              onChange={(event) => setVisibility(event.target.value as 'public' | 'private')}
            >
              <option value="public">Public</option>
              <option value="private">Privé</option>
            </select>
          </label>

          <div className={styles.row}>
            <Button
              size="sm"
              loading={busy === 'save'}
              onClick={() => {
                void run('save', 'Modifications enregistrées.', () =>
                  request('PATCH', `/api/admin/media/${item.id}`, {
                    altText: alt.trim() === '' ? null : alt.trim(),
                    visibility,
                  }),
                );
              }}
            >
              Enregistrer
            </Button>
            <label className={styles.row}>
              <span className="visually-hidden">Remplacer le fichier {item.originalName}</span>
              <input
                type="file"
                aria-label={`Remplacer le fichier ${item.originalName}`}
                accept={item.kind === 'image' ? 'image/jpeg,image/png,image/webp,image/avif' : 'application/pdf'}
                disabled={busy !== null}
                onChange={(event) => {
                  const replacement = event.target.files?.[0];
                  event.target.value = '';
                  if (!replacement) return;
                  void run('replace', 'Fichier remplacé.', () =>
                    uploadFile({
                      url: `/api/admin/media/${item.id}/file`,
                      method: 'PUT',
                      file: replacement,
                      csrfToken: getCsrfToken(),
                    }),
                  );
                }}
              />
            </label>
            <ConfirmButton
              label="Supprimer"
              confirmLabel="Confirmer la suppression"
              busy={busy === 'delete'}
              onConfirm={() => {
                void run('delete', 'Fichier supprimé.', () => request('DELETE', `/api/admin/media/${item.id}`));
              }}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
