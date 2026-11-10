import { useRef, useState, type FormEvent } from 'react';
import { Badge, Button, Card, Spinner } from '../../components/ui';
import { usePageMeta } from '../../hooks/usePageMeta';
import { AdminApiError } from '../../lib/adminApi';
import { formatBytes, formatDateTime } from '../../lib/format';
import { uploadFile } from '../../lib/upload';
import { ConfirmButton } from './ConfirmButton';
import { useAdminApi } from './useAdminApi';
import { useAdminResource } from './useAdminResource';
import styles from './pages.module.css';

interface CvVersion {
  id: number;
  status: 'draft' | 'published' | 'archived';
  originalName: string;
  sizeBytes: number;
  createdAt: string;
  publishedAt: string | null;
  fileUrl: string;
}

interface CvOverview {
  current: CvVersion | null;
  draft: CvVersion | null;
  archived: CvVersion[];
  maxSizeMb: number;
}

type Notice = { tone: 'success' | 'error'; text: string };

/** Contrôle rapide avant l'envoi. Le serveur refait toujours ses propres contrôles sur le contenu réel du fichier. */
function checkFile(file: File, maxSizeMb: number): string | null {
  const looksLikePdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (!looksLikePdf) return 'Choisissez un fichier PDF.';
  if (file.size === 0) return 'Le fichier est vide.';
  if (file.size > maxSizeMb * 1024 * 1024) return `Le fichier dépasse la taille maximale (${maxSizeMb} Mo).`;
  return null;
}

export function CvPage() {
  usePageMeta('Gestion du CV');
  const resource = useAdminResource<CvOverview>('/api/admin/cv');
  const { request, getCsrfToken, handleError } = useAdminApi();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function run(key: string, successText: string, action: () => Promise<unknown>) {
    setBusy(key);
    setNotice(null);
    try {
      await action();
      setNotice({ tone: 'success', text: successText });
      resource.reload();
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof AdminApiError ? error.message : 'L’action a échoué.' });
    } finally {
      setBusy(null);
    }
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!resource.data || progress !== null) return;
    if (!file) {
      setNotice({ tone: 'error', text: 'Choisissez d’abord un fichier PDF.' });
      return;
    }
    const problem = checkFile(file, resource.data.maxSizeMb);
    if (problem) {
      setNotice({ tone: 'error', text: problem });
      return;
    }

    setNotice(null);
    setProgress(0);
    try {
      await uploadFile({ url: '/api/admin/cv', file, csrfToken: getCsrfToken(), onProgress: setProgress });
      setNotice({ tone: 'success', text: 'Nouvelle version importée. Vérifiez l’aperçu, puis publiez-la.' });
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
      resource.reload();
    } catch (error) {
      handleError(error);
      setNotice({ tone: 'error', text: error instanceof AdminApiError ? error.message : 'L’envoi a échoué.' });
    } finally {
      setProgress(null);
    }
  }

  const data = resource.data;

  return (
    <div className={styles.page}>
      <h1>Gestion du CV</h1>

      <div aria-live="polite">
        {notice && (
          <p role={notice.tone === 'error' ? 'alert' : 'status'} className={notice.tone === 'error' ? styles.error : styles.success}>
            {notice.text}
          </p>
        )}
      </div>

      {resource.status === 'loading' && !data && <Spinner label="Chargement du CV…" />}
      {resource.status === 'error' && (
        <p role="alert" className={styles.error}>
          {resource.error}
        </p>
      )}

      {data && (
        <>
          <section aria-labelledby="cv-publie" className={styles.section}>
            <h2 id="cv-publie">CV publié</h2>
            {data.current ? (
              <Card>
                <div className={styles.section}>
                  <div className={styles.row}>
                    <Badge tone="success">En ligne</Badge>
                    <strong>{data.current.originalName}</strong>
                  </div>
                  <p className={styles.muted}>
                    {formatBytes(data.current.sizeBytes)}
                    {data.current.publishedAt ? ` · publié le ${formatDateTime(data.current.publishedAt)}` : ''}
                  </p>
                  <p>Le bouton « Télécharger mon CV » est visible sur le site et donne cette version.</p>
                  <div className={styles.row}>
                    <a href={data.current.fileUrl} target="_blank" rel="noopener noreferrer">
                      Ouvrir dans un nouvel onglet
                    </a>
                    <Button href={`${data.current.fileUrl}?download=1`} variant="secondary" size="sm">
                      Télécharger
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={busy === 'unpublish'}
                      onClick={() => {
                        void run('unpublish', 'CV masqué : le bouton de téléchargement a disparu du site.', () =>
                          request('POST', '/api/admin/cv/unpublish'),
                        );
                      }}
                    >
                      Masquer le CV
                    </Button>
                  </div>
                </div>
              </Card>
            ) : (
              <p>Aucun CV n’est publié : le bouton de téléchargement est masqué sur le site.</p>
            )}
          </section>

          <section aria-labelledby="cv-import" className={styles.section}>
            <h2 id="cv-import">Importer une nouvelle version</h2>
            <form
              className={styles.uploadForm}
              onSubmit={(event) => {
                void handleUpload(event);
              }}
              noValidate
            >
              <label className={styles.section}>
                <span>Fichier PDF (maximum {data.maxSizeMb} Mo)</span>
                <input
                  ref={inputRef}
                  className={styles.fileInput}
                  type="file"
                  accept="application/pdf,.pdf"
                  disabled={progress !== null}
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                />
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
              <p className={styles.muted}>
                La nouvelle version est d’abord importée comme brouillon : le CV en ligne ne change qu’au moment où vous la publiez.
                Un envoi qui échoue ne modifie jamais le CV actuel.
              </p>
            </form>
          </section>

          {data.draft && (
            <section aria-labelledby="cv-brouillon" className={styles.section}>
              <h2 id="cv-brouillon">Version importée, non publiée</h2>
              <div className={styles.row}>
                <Badge tone="warning">Brouillon</Badge>
                <strong>{data.draft.originalName}</strong>
                <span className={styles.muted}>
                  {formatBytes(data.draft.sizeBytes)} · importé le {formatDateTime(data.draft.createdAt)}
                </span>
              </div>
              <iframe className={styles.preview} title="Aperçu de la version importée" src={data.draft.fileUrl} />
              <p className={styles.muted}>
                Si l’aperçu ne s’affiche pas,{' '}
                <a href={data.draft.fileUrl} target="_blank" rel="noopener noreferrer">
                  ouvrez le fichier dans un nouvel onglet
                </a>
                .
              </p>
              <div className={styles.row}>
                <Button
                  loading={busy === `publish-${data.draft.id}`}
                  onClick={() => {
                    const id = data.draft?.id;
                    if (id === undefined) return;
                    void run(`publish-${id}`, 'Nouvelle version publiée : elle est disponible sur le site.', () =>
                      request('POST', `/api/admin/cv/${id}/publish`),
                    );
                  }}
                >
                  Publier cette version
                </Button>
                <ConfirmButton
                  label="Annuler l’import"
                  confirmLabel="Confirmer l’annulation"
                  busy={busy === `delete-${data.draft.id}`}
                  onConfirm={() => {
                    const id = data.draft?.id;
                    if (id === undefined) return;
                    void run(`delete-${id}`, 'Import annulé : le brouillon a été supprimé.', () =>
                      request('DELETE', `/api/admin/cv/${id}`),
                    );
                  }}
                />
              </div>
              {data.current && <p className={styles.muted}>La publication remplacera le CV actuellement en ligne, qui sera archivé.</p>}
            </section>
          )}

          <section aria-labelledby="cv-archives" className={styles.section}>
            <h2 id="cv-archives">Anciennes versions</h2>
            {data.archived.length === 0 ? (
              <p className={styles.muted}>Aucune ancienne version.</p>
            ) : (
              <ul className={styles.list}>
                {data.archived.map((version) => (
                  <li key={version.id}>
                    <Card>
                      <div className={styles.section}>
                        <div className={styles.row}>
                          <Badge>Archivée</Badge>
                          <strong>{version.originalName}</strong>
                          <span className={styles.muted}>
                            {formatBytes(version.sizeBytes)} · importée le {formatDateTime(version.createdAt)}
                          </span>
                        </div>
                        <div className={styles.row}>
                          <Button href={`${version.fileUrl}?download=1`} variant="secondary" size="sm">
                            Télécharger
                          </Button>
                          <Button
                            size="sm"
                            loading={busy === `publish-${version.id}`}
                            onClick={() => {
                              void run(`publish-${version.id}`, 'Version republiée : elle est disponible sur le site.', () =>
                                request('POST', `/api/admin/cv/${version.id}/publish`),
                              );
                            }}
                          >
                            Republier
                          </Button>
                          <ConfirmButton
                            label="Supprimer"
                            confirmLabel="Confirmer la suppression"
                            busy={busy === `delete-${version.id}`}
                            onConfirm={() => {
                              void run(`delete-${version.id}`, 'Version supprimée.', () =>
                                request('DELETE', `/api/admin/cv/${version.id}`),
                              );
                            }}
                          />
                        </div>
                      </div>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
