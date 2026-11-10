import { AdminApiError, networkError } from './adminApi';

export interface UploadOptions {
  url: string;
  method?: 'POST' | 'PUT';
  file: File;
  /** Champs supplémentaires du formulaire (ex. texte alternatif). */
  fields?: Record<string, string>;
  csrfToken: string | null;
  /** Reçoit l'avancement de l'envoi, de 0 à 100. */
  onProgress?: (percent: number) => void;
}

/**
 * Envoie un fichier avec une barre de progression (fetch ne sait pas suivre un envoi, XMLHttpRequest oui).
 * Résout avec le contenu `data` de la réponse, ou rejette avec une AdminApiError.
 */
export function uploadFile<T>(options: UploadOptions): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open(options.method ?? 'POST', options.url);
    request.withCredentials = true;
    if (options.csrfToken) request.setRequestHeader('X-CSRF-Token', options.csrfToken);
    // Pas de Content-Type : le navigateur ajoute lui-même la séparation (boundary) du formulaire.

    request.upload.onprogress = (event) => {
      if (event.lengthComputable && options.onProgress) {
        options.onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    request.onload = () => {
      let body: { data?: T; error?: { code?: string; message?: string; details?: unknown } } = {};
      try {
        body = JSON.parse(request.responseText) as typeof body;
      } catch {
        // réponse non JSON : on garde un message générique
      }
      if (request.status >= 200 && request.status < 300 && body.data !== undefined) {
        resolve(body.data);
        return;
      }
      reject(
        new AdminApiError(
          request.status,
          body.error?.code ?? null,
          body.error?.message ?? 'L’envoi a échoué.',
          body.error?.details,
        ),
      );
    };
    request.onerror = () => reject(networkError());
    request.onabort = () => reject(new AdminApiError(0, null, 'L’envoi a été interrompu.'));

    const form = new FormData();
    for (const [name, value] of Object.entries(options.fields ?? {})) form.append(name, value);
    form.append('file', options.file);
    request.send(form);
  });
}
