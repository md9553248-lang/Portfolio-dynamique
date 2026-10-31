/** Erreur dont le message peut être montré au visiteur, avec le code HTTP à renvoyer. */
export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields?: Record<string, string>;

  constructor(status: number, code: string, message: string, fields?: Record<string, string>) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    if (fields) this.fields = fields;
  }
}

export class NotFoundError extends HttpError {
  constructor(message = 'Ressource introuvable.') {
    super(404, 'NOT_FOUND', message);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends HttpError {
  constructor(fields: Record<string, string>) {
    super(400, 'VALIDATION_ERROR', 'Les données envoyées sont invalides.', fields);
    this.name = 'ValidationError';
  }
}
