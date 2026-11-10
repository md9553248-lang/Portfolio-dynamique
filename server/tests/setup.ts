// Charge server/.env pour que les tests d'intégration MySQL trouvent leur configuration.
import 'dotenv/config';
import { afterAll } from 'vitest';
import { cleanupTempDirs } from './helpers/temp.js';

// Supprime les dossiers de stockage temporaires créés pendant les tests.
afterAll(() => {
  cleanupTempDirs();
});
