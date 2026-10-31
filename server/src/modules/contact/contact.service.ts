import type { Logger } from 'pino';
import { hmacHash } from '../../utils/hash.js';
import type { ContactInput } from './contact.schema.js';
import type { ContactRepository } from './contact.repository.js';

export function createContactService(
  repo: ContactRepository,
  options: { ipHashSecret: string; logger: Logger },
) {
  return {
    /**
     * Enregistre un message. Si le champ piège est rempli, le message est ignoré en silence :
     * le robot reçoit la même réponse de succès et ne sait pas qu'il a été repéré.
     */
    async submit(input: ContactInput, context: { ip: string }): Promise<void> {
      if (input.website !== undefined && input.website !== '') {
        options.logger.info('Message ignoré : champ piège rempli');
        return;
      }
      await repo.insertMessage({
        name: input.name,
        email: input.email,
        subject: input.subject,
        body: input.message,
        ipHash: hmacHash(options.ipHashSecret, context.ip),
      });
    },
  };
}

export type ContactService = ReturnType<typeof createContactService>;
