import type { Request, Response } from 'express';
import type { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

export interface SendFileOptions {
  stream: Readable;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  /** inline : affiché dans le navigateur (aperçu) ; attachment : téléchargé. */
  disposition: 'inline' | 'attachment';
  filename: string;
  cacheControl: string;
}

/** En-tête Content-Disposition sûr : nom ASCII de secours + nom complet encodé (RFC 5987). */
export function contentDisposition(type: 'inline' | 'attachment', filename: string): string {
  const fallback = filename.replace(/[^A-Za-z0-9._-]+/g, '_') || 'fichier';
  return `${type}; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

/**
 * Envoie un fichier avec des en-têtes stricts :
 * - le type vient de la base (type RÉEL détecté à l'envoi), jamais de l'extension ;
 * - nosniff : le navigateur ne doit pas deviner un autre type ;
 * - ETag (empreinte du fichier) : un fichier remplacé est vu tout de suite, un fichier inchangé n'est pas retéléchargé.
 */
export async function sendFile(req: Request, res: Response, options: SendFileOptions): Promise<void> {
  const etag = `"${options.sha256}"`;
  res.setHeader('ETag', etag);
  res.setHeader('Cache-Control', options.cacheControl);
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.headers['if-none-match'] === etag) {
    options.stream.destroy();
    res.status(304).end();
    return;
  }

  res.setHeader('Content-Type', options.mimeType);
  res.setHeader('Content-Length', String(options.sizeBytes));
  res.setHeader('Content-Disposition', contentDisposition(options.disposition, options.filename));
  await pipeline(options.stream, res);
}
