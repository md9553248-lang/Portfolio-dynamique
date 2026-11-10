import { randomUUID } from 'node:crypto';
import { existsSync, readdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createLocalStorage } from '../../src/storage/local-storage.js';
import { isValidStorageKey } from '../../src/storage/storage.js';
import { createTempDir } from '../helpers/temp.js';

async function readAll(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk as Buffer));
  return Buffer.concat(chunks);
}

describe('clé de stockage', () => {
  it('n’accepte que des UUID', () => {
    expect(isValidStorageKey(randomUUID())).toBe(true);
    for (const bad of ['', 'cv.pdf', '../secret', '../../etc/passwd', 'a/b', 'C:\\x', randomUUID() + '/..', randomUUID().toUpperCase()]) {
      expect(isValidStorageKey(bad), bad).toBe(false);
    }
  });
});

describe('createLocalStorage', () => {
  it('enregistre, relit, signale l’existence et supprime un fichier', async () => {
    const storage = createLocalStorage(createTempDir());
    const key = randomUUID();

    expect(await storage.exists(key)).toBe(false);
    await storage.save(key, Buffer.from('contenu'));
    expect(await storage.exists(key)).toBe(true);
    expect((await readAll(await storage.read(key))).toString()).toBe('contenu');

    await storage.delete(key);
    expect(await storage.exists(key)).toBe(false);
  });

  it('supprimer un fichier absent ne provoque aucune erreur', async () => {
    const storage = createLocalStorage(createTempDir());
    await expect(storage.delete(randomUUID())).resolves.toBeUndefined();
  });

  it('refuse une lecture de fichier absent', async () => {
    const storage = createLocalStorage(createTempDir());
    await expect(storage.read(randomUUID())).rejects.toThrow();
  });

  it('refuse toute clé qui n’est pas un UUID (aucune traversée de dossier possible)', async () => {
    const root = createTempDir();
    const storage = createLocalStorage(path.join(root, 'storage'));
    for (const key of ['../evasion', '..\\evasion', '/etc/passwd', 'a/../../b', 'nom-libre.pdf']) {
      await expect(storage.save(key, Buffer.from('x')), key).rejects.toThrow();
      await expect(storage.read(key), key).rejects.toThrow();
      await expect(storage.delete(key), key).rejects.toThrow();
      await expect(storage.exists(key)).resolves.toBe(false);
    }
    // Rien n'a été écrit en dehors du dossier de stockage.
    expect(readdirSync(root).filter((name) => name !== 'storage')).toEqual([]);
  });

  it('range les fichiers sous le dossier racine, nommés par leur clé', async () => {
    const root = createTempDir();
    const storage = createLocalStorage(root);
    const key = randomUUID();
    await storage.save(key, Buffer.from('x'));
    expect(existsSync(path.join(root, key.slice(0, 2), key))).toBe(true);
    expect((await readFile(path.join(root, key.slice(0, 2), key))).toString()).toBe('x');
  });

  it('ne laisse aucun fichier temporaire après l’écriture', async () => {
    const root = createTempDir();
    const storage = createLocalStorage(root);
    const key = randomUUID();
    await storage.save(key, Buffer.from('original'));
    // Une seconde écriture sous la même clé est acceptée (renommage), mais aucun fichier .tmp ne reste.
    await storage.save(key, Buffer.from('nouveau')).catch(() => undefined);
    const folder = path.join(root, key.slice(0, 2));
    expect(readdirSync(folder).filter((name) => name.endsWith('.tmp'))).toEqual([]);
  });
});
