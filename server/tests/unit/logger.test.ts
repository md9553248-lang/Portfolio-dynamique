import { Writable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { createLogger } from '../../src/logging/logger.js';

describe('createLogger', () => {
  it('masque les mots de passe, cookies et jetons dans les journaux', () => {
    const chunks: string[] = [];
    const stream = new Writable({
      write(chunk, _encoding, callback) {
        chunks.push(String(chunk));
        callback();
      },
    });
    const logger = createLogger('info', stream);

    logger.info(
      {
        user: { password: 'secret-123', token: 'jeton-abc' },
        req: { headers: { cookie: 'sid=cookie-xyz', authorization: 'Bearer bearer-xyz' } },
      },
      'test',
    );

    const output = chunks.join('');
    expect(output).toContain('[REDACTED]');
    expect(output).not.toContain('secret-123');
    expect(output).not.toContain('jeton-abc');
    expect(output).not.toContain('cookie-xyz');
    expect(output).not.toContain('bearer-xyz');
  });
});
