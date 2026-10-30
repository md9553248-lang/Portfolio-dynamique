import mysql from 'mysql2/promise';
import type { Pool } from 'mysql2/promise';
import type { Env } from '../config/env.js';
import { appPoolOptions } from './config.js';

/** Crée le pool de connexions de l'application (utilisé par l'API à partir de la Phase 05). */
export function createAppPool(env: Env): Pool {
  return mysql.createPool(appPoolOptions(env));
}
