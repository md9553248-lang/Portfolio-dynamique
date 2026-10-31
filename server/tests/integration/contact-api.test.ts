import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createTestApp } from '../helpers/fakes.js';

const validBody = {
  name: 'Awa Ndiaye',
  email: 'awa@exemple.com',
  subject: 'Proposition de stage',
  message: 'Bonjour, je souhaite échanger avec vous.',
};

function post(app: ReturnType<typeof createTestApp>['app'], body: unknown) {
  return request(app)
    .post('/api/contact')
    .set('Content-Type', 'application/json')
    .send(JSON.stringify(body));
}

describe('POST /api/contact', () => {
  it('enregistre un message valide et répond 201 sans renvoyer les données', async () => {
    const { app, spies } = createTestApp();
    const res = await post(app, validBody);

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ data: { received: true } });
    expect(res.headers['cache-control']).toBe('no-store');
    expect(JSON.stringify(res.body)).not.toContain('Awa');

    expect(spies.insertMessage).toHaveBeenCalledTimes(1);
    const saved = spies.insertMessage.mock.calls[0]?.[0];
    expect(saved).toMatchObject({
      name: 'Awa Ndiaye',
      email: 'awa@exemple.com',
      subject: 'Proposition de stage',
      body: 'Bonjour, je souhaite échanger avec vous.',
    });
  });

  it('ne stocke qu’une empreinte de l’adresse IP, jamais l’adresse elle-même', async () => {
    const { app, spies } = createTestApp();
    await post(app, validBody);
    const saved = spies.insertMessage.mock.calls[0]?.[0];
    expect(saved?.ipHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('supprime les espaces en début et fin de saisie', async () => {
    const { app, spies } = createTestApp();
    await post(app, { ...validBody, name: '  Awa Ndiaye  ', subject: '  Stage  ' });
    const saved = spies.insertMessage.mock.calls[0]?.[0];
    expect(saved?.name).toBe('Awa Ndiaye');
    expect(saved?.subject).toBe('Stage');
  });

  it('accepte les retours à la ligne dans le message', async () => {
    const { app } = createTestApp();
    const res = await post(app, {
      ...validBody,
      message: 'Première ligne.\nSeconde ligne du message.',
    });
    expect(res.status).toBe(201);
  });

  it('refuse un corps vide avec le détail de chaque champ', async () => {
    const { app, spies } = createTestApp();
    const res = await post(app, {});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(Object.keys(res.body.error.fields).sort()).toEqual([
      'email',
      'message',
      'name',
      'subject',
    ]);
    expect(spies.insertMessage).not.toHaveBeenCalled();
  });

  it('refuse les valeurs invalides ou trop longues', async () => {
    const { app } = createTestApp();
    const badEmail = await post(app, { ...validBody, email: 'pas-un-email' });
    expect(badEmail.body.error.fields.email).toBeDefined();

    const longMessage = await post(app, { ...validBody, message: 'x'.repeat(5001) });
    expect(longMessage.status).toBe(400);
    expect(longMessage.body.error.fields.message).toBeDefined();

    const notText = await post(app, { ...validBody, name: 12345 });
    expect(notText.status).toBe(400);
  });

  it('refuse les sauts de ligne dans le sujet, le nom et l’e-mail (injection d’en-têtes)', async () => {
    const { app, spies } = createTestApp();
    const res = await post(app, {
      ...validBody,
      subject: 'Bonjour\r\nBcc: autre@exemple.com',
      name: 'Awa\nNdiaye',
    });
    expect(res.status).toBe(400);
    expect(res.body.error.fields.subject).toBeDefined();
    expect(res.body.error.fields.name).toBeDefined();
    expect(spies.insertMessage).not.toHaveBeenCalled();
  });

  it('refuse un champ inattendu', async () => {
    const { app, spies } = createTestApp();
    const res = await post(app, { ...validBody, role: 'admin' });
    expect(res.status).toBe(400);
    expect(res.body.error.fields['_form']).toBeDefined();
    expect(spies.insertMessage).not.toHaveBeenCalled();
  });

  it('ignore en silence un robot qui remplit le champ piège', async () => {
    const { app, spies } = createTestApp();
    const res = await post(app, { ...validBody, website: 'http://spam.example' });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ data: { received: true } });
    expect(spies.insertMessage).not.toHaveBeenCalled();
  });

  it('accepte un champ piège vide (comportement normal d’un navigateur)', async () => {
    const { app, spies } = createTestApp();
    const res = await post(app, { ...validBody, website: '' });
    expect(res.status).toBe(201);
    expect(spies.insertMessage).toHaveBeenCalledTimes(1);
  });

  it('refuse un envoi qui n’est pas en JSON (formulaire classique, texte brut)', async () => {
    const { app, spies } = createTestApp();
    const form = await request(app).post('/api/contact').type('form').send(validBody);
    expect(form.status).toBe(415);
    const plain = await request(app).post('/api/contact').type('text').send('name=Awa');
    expect(plain.status).toBe(415);
    expect(spies.insertMessage).not.toHaveBeenCalled();
  });

  it('refuse un corps trop volumineux', async () => {
    const { app, spies } = createTestApp();
    const res = await post(app, { ...validBody, message: 'x'.repeat(30_000) });
    expect(res.status).toBe(413);
    expect(spies.insertMessage).not.toHaveBeenCalled();
  });

  it('limite le nombre d’envois par adresse IP (429)', async () => {
    const { app, spies } = createTestApp(
      {},
      { rateLimits: { contact: { windowMs: 3_600_000, limit: 2 } } },
    );
    expect((await post(app, validBody)).status).toBe(201);
    expect((await post(app, validBody)).status).toBe(201);
    const limited = await post(app, validBody);
    expect(limited.status).toBe(429);
    expect(limited.body.error.code).toBe('TOO_MANY_REQUESTS');
    expect(limited.headers['retry-after']).toBe('3600');
    expect(spies.insertMessage).toHaveBeenCalledTimes(2);
  });

  it('compte aussi les envois invalides dans la limite (anti-abus)', async () => {
    const { app } = createTestApp(
      {},
      { rateLimits: { contact: { windowMs: 3_600_000, limit: 2 } } },
    );
    await post(app, {});
    await post(app, {});
    expect((await post(app, validBody)).status).toBe(429);
  });

  it('répond 500 sans détail interne si l’enregistrement échoue', async () => {
    const { app } = createTestApp({
      contact: {
        insertMessage: async () => {
          throw new Error("ER_ACCESS_DENIED pour l'utilisateur portfolio_app");
        },
      },
    });
    const res = await post(app, validBody);
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain('portfolio_app');
  });

  it('n’accepte que la méthode POST', async () => {
    const { app } = createTestApp();
    expect((await request(app).get('/api/contact')).status).toBe(404);
  });
});
