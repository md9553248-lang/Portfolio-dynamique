import { describe, expect, it } from 'vitest';
import {
  generateSessionToken,
  hashSessionToken,
  isWellFormedToken,
  parseCookies,
  readSessionToken,
} from '../../src/modules/auth/session-cookie.js';

describe('jeton de session', () => {
  it('est aléatoire, de 43 caractères sûrs pour une URL ou un cookie', () => {
    const first = generateSessionToken();
    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(generateSessionToken()).not.toBe(first);
  });

  it('est stocké sous forme d’empreinte différente du jeton', () => {
    const token = generateSessionToken();
    const hash = hashSessionToken(token);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain(token);
    expect(hashSessionToken(token)).toBe(hash);
  });

  it('rejette les jetons mal formés', () => {
    expect(isWellFormedToken(generateSessionToken())).toBe(true);
    expect(isWellFormedToken('')).toBe(false);
    expect(isWellFormedToken('court')).toBe(false);
    expect(isWellFormedToken("x' OR '1'='1")).toBe(false);
    expect(isWellFormedToken('a'.repeat(44))).toBe(false);
    expect(isWellFormedToken('a'.repeat(42) + '=')).toBe(false);
  });
});

describe('parseCookies', () => {
  it('lit plusieurs cookies, avec ou sans espaces', () => {
    const cookies = parseCookies('a=1; b=2;c=3');
    expect(cookies.get('a')).toBe('1');
    expect(cookies.get('b')).toBe('2');
    expect(cookies.get('c')).toBe('3');
  });

  it('décode les valeurs et retire les guillemets', () => {
    expect(parseCookies('a="x y"').get('a')).toBe('x y');
    expect(parseCookies('a=x%20y').get('a')).toBe('x y');
  });

  it('garde la première valeur en cas de doublon (un cookie injecté ne remplace pas le vrai)', () => {
    expect(parseCookies('s=premier; s=second').get('s')).toBe('premier');
  });

  it('ignore les éléments mal formés sans planter', () => {
    const cookies = parseCookies('=vide; sansvaleur; bad=%E0%A4%A; ok=1');
    expect(cookies.get('ok')).toBe('1');
    expect(cookies.has('bad')).toBe(false);
    expect(cookies.has('sansvaleur')).toBe(false);
  });

  it('renvoie une liste vide pour un en-tête absent', () => {
    expect(parseCookies(undefined).size).toBe(0);
    expect(readSessionToken(undefined, 'session')).toBeNull();
  });

  it('lit le cookie de session par son nom', () => {
    expect(readSessionToken('x=1; session=abc', 'session')).toBe('abc');
    expect(readSessionToken('x=1', 'session')).toBeNull();
  });
});
