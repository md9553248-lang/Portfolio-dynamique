import { describe, expect, it } from 'vitest';
import { contentDisposition } from '../../src/http/send-file.js';

describe('contentDisposition', () => {
  it('propose un nom ASCII sûr et le nom complet encodé', () => {
    expect(contentDisposition('attachment', 'CV-Mouhamed-Diagne.pdf')).toBe(
      "attachment; filename=\"CV-Mouhamed-Diagne.pdf\"; filename*=UTF-8''CV-Mouhamed-Diagne.pdf",
    );
    const header = contentDisposition('inline', 'Éléonore CV.pdf');
    expect(header).toContain('inline; filename="_l_onore_CV.pdf"');
    expect(header).toContain("filename*=UTF-8''%C3%89l%C3%A9onore%20CV.pdf");
  });

  it('neutralise les guillemets et les sauts de ligne (injection d’en-tête)', () => {
    const header = contentDisposition('attachment', 'x"\r\nSet-Cookie: a=b.pdf');
    expect(header).not.toContain('\r');
    expect(header).not.toContain('\n');
    expect(header.split('filename="')[1]?.split('"')[0]).not.toContain('"');
  });
});
