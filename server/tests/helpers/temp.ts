import { mkdtempSync, readdirSync, rmSync, statSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const directories: string[] = [];

/** Crée un dossier temporaire pour le stockage des tests (supprimé automatiquement à la fin). */
export function createTempDir(): string {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'portfolio-test-'));
  directories.push(directory);
  return directory;
}

export function cleanupTempDirs(): void {
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
}

/** Liste tous les fichiers (récursivement) d'un dossier. */
export function listFiles(directory: string): string[] {
  const found: string[] = [];
  for (const name of readdirSync(directory)) {
    const fullPath = path.join(directory, name);
    if (statSync(fullPath).isDirectory()) found.push(...listFiles(fullPath));
    else found.push(fullPath);
  }
  return found;
}

/** Lecteur de réponses binaires (PDF, images) pour supertest : renvoie le contenu exact dans `res.body`. */
export function binaryParser(
  res: NodeJS.ReadableStream,
  callback: (error: Error | null, body: Buffer) => void,
): void {
  const chunks: Buffer[] = [];
  res.on('data', (chunk: Buffer) => chunks.push(chunk));
  res.on('end', () => callback(null, Buffer.concat(chunks)));
}
