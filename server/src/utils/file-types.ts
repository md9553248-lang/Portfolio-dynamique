/*
 * Détection du TYPE RÉEL d'un fichier d'après son contenu (« signature » des premiers octets),
 * jamais d'après son extension ni le type annoncé par le navigateur, qui sont falsifiables.
 */

export type FileKind = 'pdf' | 'jpeg' | 'png' | 'webp' | 'avif';

export interface DetectedFile {
  kind: FileKind;
  mime: string;
}

export const IMAGE_KINDS: readonly FileKind[] = ['jpeg', 'png', 'webp', 'avif'];

const MIME_BY_KIND: Record<FileKind, string> = {
  pdf: 'application/pdf',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
};

export function isImageKind(kind: FileKind): boolean {
  return IMAGE_KINDS.includes(kind);
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function ascii(data: Buffer, start: number, end: number): string {
  return data.subarray(start, end).toString('latin1');
}

/** Renvoie le type réel du fichier, ou null s'il n'est pas dans la liste autorisée (PDF et images courantes). */
export function detectFileType(data: Buffer): DetectedFile | null {
  let kind: FileKind | null = null;

  if (data.length >= 8 && ascii(data, 0, 5) === '%PDF-') {
    // Un vrai PDF se termine par « %%EOF » : on refuse les fichiers tronqués ou fabriqués à la main.
    kind = data.subarray(Math.max(0, data.length - 2048)).includes('%%EOF') ? 'pdf' : null;
  } else if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) {
    kind = 'jpeg';
  } else if (data.length >= 8 && data.subarray(0, 8).equals(PNG_SIGNATURE)) {
    kind = 'png';
  } else if (data.length >= 12 && ascii(data, 0, 4) === 'RIFF' && ascii(data, 8, 12) === 'WEBP') {
    kind = 'webp';
  } else if (data.length >= 12 && ascii(data, 4, 8) === 'ftyp' && ['avif', 'avis'].includes(ascii(data, 8, 12))) {
    kind = 'avif';
  }

  return kind ? { kind, mime: MIME_BY_KIND[kind] } : null;
}

/**
 * Recherche, dans un PDF, des éléments actifs dangereux (JavaScript, lancement de programme, fichiers joints).
 * Renvoie le motif trouvé, ou null. C'est une défense en plus : un PDF peut compresser ces éléments, donc cette
 * vérification ne remplace pas le fait que le navigateur ouvre le PDF dans son visionneur isolé.
 */
export function findActivePdfContent(data: Buffer): string | null {
  const match = /\/(JavaScript|JS|Launch|EmbeddedFiles?|RichMedia|XFA)\b/.exec(data.toString('latin1'));
  return match?.[1] ?? null;
}

/** Nom d'origine affiché dans l'interface : sans chemin, sans caractères de contrôle, 255 caractères maximum. */
export function sanitizeOriginalName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? '';
  let cleaned = '';
  for (const character of base) {
    const code = character.codePointAt(0) ?? 0;
    if (code >= 32 && code !== 127) cleaned += character;
  }
  cleaned = cleaned.trim().slice(0, 255);
  return cleaned === '' || cleaned === '.' || cleaned === '..' ? 'fichier' : cleaned;
}

/** Nom proposé au téléchargement du CV public : « CV-Prenom-Nom.pdf », uniquement lettres, chiffres et tirets. */
export function cvDownloadName(displayName: string | null | undefined): string {
  const words = (displayName ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^A-Za-z0-9]+/)
    .filter((word) => word !== '');
  return words.length > 0 ? `CV-${words.join('-')}.pdf` : 'CV.pdf';
}
