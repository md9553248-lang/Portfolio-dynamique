export interface NewMessage {
  name: string;
  email: string;
  subject: string;
  body: string;
  /** Empreinte de l'adresse IP (jamais l'adresse brute). */
  ipHash: string;
}

export interface ContactRepository {
  /** Enregistre un message et renvoie son identifiant. */
  insertMessage(message: NewMessage): Promise<number>;
}
