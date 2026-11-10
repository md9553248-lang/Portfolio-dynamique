/** Fichiers de test fabriqués à la main (signatures réelles, contenu minimal). */

export function pdfBuffer(body = ''): Buffer {
  return Buffer.from(`%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n${body}\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n`);
}

export function pdfWithJavaScript(): Buffer {
  return pdfBuffer('2 0 obj\n<< /S /JavaScript /JS (app.alert(1)) >>\nendobj');
}

export function pngBuffer(): Buffer {
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from('contenu-png')]);
}

export function jpegBuffer(): Buffer {
  return Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from('contenu-jpeg')]);
}

export function webpBuffer(): Buffer {
  return Buffer.concat([Buffer.from('RIFF'), Buffer.from([0x10, 0, 0, 0]), Buffer.from('WEBPVP8 ')]);
}

export function avifBuffer(): Buffer {
  return Buffer.concat([Buffer.from([0, 0, 0, 0x1c]), Buffer.from('ftypavif'), Buffer.from('....mif1avif')]);
}

export function svgBuffer(): Buffer {
  return Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
}

export function htmlBuffer(): Buffer {
  return Buffer.from('<html><body><script>alert(1)</script></body></html>');
}

export function exeBuffer(): Buffer {
  return Buffer.concat([Buffer.from('MZ'), Buffer.alloc(64, 1)]);
}
