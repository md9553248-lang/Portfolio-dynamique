import pino, { type DestinationStream, type Logger } from 'pino';

/** Champs qui ne doivent jamais apparaître dans les journaux. */
const REDACTED_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  '*.password',
  '*.passwordHash',
  '*.token',
  '*.secret',
  '*.sessionToken',
];

export function createLogger(level: string, destination?: DestinationStream): Logger {
  return pino({ level, redact: { paths: REDACTED_PATHS, censor: '[REDACTED]' } }, destination);
}
