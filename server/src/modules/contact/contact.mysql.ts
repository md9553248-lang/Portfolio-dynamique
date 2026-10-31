import type { Pool, ResultSetHeader } from 'mysql2/promise';
import type { ContactRepository, NewMessage } from './contact.repository.js';

export function createMysqlContactRepository(pool: Pool): ContactRepository {
  return {
    async insertMessage(message: NewMessage) {
      // Requête préparée : les valeurs ne sont jamais assemblées dans le texte SQL.
      const [result] = await pool.execute<ResultSetHeader>(
        'INSERT INTO messages (name, email, subject, body, ip_hash) VALUES (?, ?, ?, ?, ?)',
        [message.name, message.email, message.subject, message.body, message.ipHash],
      );
      return result.insertId;
    },
  };
}
