import { describe, expect, it } from 'vitest';
import {
  cvDownloadName,
  detectFileType,
  findActivePdfContent,
  isImageKind,
  sanitizeOriginalName,
} from '../../src/utils/file-types.js';
import {
  avifBuffer,
  exeBuffer,
  htmlBuffer,
  jpegBuffer,
  pdfBuffer,
  pdfWithJavaScript,
  pngBuffer,
  svgBuffer,
  webpBuffer,
} from '../helpers/files.js';

describe('detectFileType (type réel d’après le contenu)', () => {
  it('reconnaît les formats autorisés', () => {
    expect(detectFileType(pdfBuffer())).toEqual({ kind: 'pdf', mime: 'application/pdf' });
    expect(detectFileType(pngBuffer())?.mime).toBe('image/png');
    expect(detectFileType(jpegBuffer())?.mime).toBe('image/jpeg');
    expect(detectFileType(webpBuffer())?.mime).toBe('image/webp');
    expect(detectFileType(avifBuffer())?.mime).toBe('image/avif');
  });

  it('refuse les formats non autorisés, même s’ils se font passer pour autre chose', () => {
    expect(detectFileType(svgBuffer())).toBeNull(); // le SVG peut contenir du code actif
    expect(detectFileType(htmlBuffer())).toBeNull();
    expect(detectFileType(exeBuffer())).toBeNull();
    expect(detectFileType(Buffer.from('juste du texte'))).toBeNull();
  });

  it('refuse un fichier vide ou trop court', () => {
    expect(detectFileType(Buffer.alloc(0))).toBeNull();
    expect(detectFileType(Buffer.from('%PDF'))).toBeNull();
    expect(detectFileType(Buffer.from([0xff, 0xd8]))).toBeNull();
  });

  it('refuse un PDF tronqué (sans marqueur de fin)', () => {
    expect(detectFileType(Buffer.from('%PDF-1.4\n1 0 obj\n<< >>\nendobj\n'))).toBeNull();
  });

  it('refuse un PDF dont la signature n’est pas au tout début', () => {
    expect(detectFileType(Buffer.concat([Buffer.from('<html>'), pdfBuffer()]))).toBeNull();
  });

  it('distingue les images du PDF', () => {
    expect(isImageKind('png')).toBe(true);
    expect(isImageKind('pdf')).toBe(false);
  });
});

describe('findActivePdfContent', () => {
  it('signale le JavaScript, le lancement de programmes et les fichiers joints', () => {
    expect(findActivePdfContent(pdfWithJavaScript())).toBe('JavaScript');
    expect(findActivePdfContent(pdfBuffer('<< /S /Launch /F (cmd.exe) >>'))).toBe('Launch');
    expect(findActivePdfContent(pdfBuffer('<< /Type /EmbeddedFile >>'))).toBe('EmbeddedFile');
  });

  it('laisse passer un PDF ordinaire, y compris avec une ouverture sur la première page', () => {
    expect(findActivePdfContent(pdfBuffer())).toBeNull();
    expect(findActivePdfContent(pdfBuffer('<< /OpenAction [3 0 R /Fit] >>'))).toBeNull();
    expect(findActivePdfContent(pdfBuffer('<< /JSONData true >>'))).toBeNull();
  });
});

describe('sanitizeOriginalName', () => {
  it('retire les chemins (Windows et Unix) et les caractères de contrôle', () => {
    expect(sanitizeOriginalName('C:\\Users\\moi\\cv.pdf')).toBe('cv.pdf');
    expect(sanitizeOriginalName('../../etc/passwd')).toBe('passwd');
    expect(sanitizeOriginalName('mon\u0000cv\n.pdf')).toBe('moncv.pdf');
  });

  it('garde les accents et limite la longueur', () => {
    expect(sanitizeOriginalName('Éléonore CV.pdf')).toBe('Éléonore CV.pdf');
    expect(sanitizeOriginalName('a'.repeat(400)).length).toBe(255);
  });

  it('remplace un nom vide ou dangereux', () => {
    expect(sanitizeOriginalName('')).toBe('fichier');
    expect(sanitizeOriginalName('..')).toBe('fichier');
    expect(sanitizeOriginalName('   ')).toBe('fichier');
  });
});

describe('cvDownloadName', () => {
  it('construit un nom sûr à partir du nom affiché', () => {
    expect(cvDownloadName('Mouhamed Diagne')).toBe('CV-Mouhamed-Diagne.pdf');
    expect(cvDownloadName('Éléonore  O’Brien')).toBe('CV-Eleonore-O-Brien.pdf');
  });

  it('retombe sur un nom neutre', () => {
    expect(cvDownloadName(null)).toBe('CV.pdf');
    expect(cvDownloadName('???')).toBe('CV.pdf');
    expect(cvDownloadName('../../x"; filename="evil')).toBe('CV-x-filename-evil.pdf');
  });
});
