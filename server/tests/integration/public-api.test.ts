import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createTestApp } from '../helpers/fakes.js';

describe('API publique : lecture', () => {
  it('liste les projets', async () => {
    const { app } = createTestApp();
    const res = await request(app).get('/api/public/projects');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].slug).toBe('api-gestion-stock');
  });

  it('transmet la catégorie, la langue et le filtre « mis en avant » au dépôt', async () => {
    const { app, spies } = createTestApp();
    const res = await request(app).get(
      '/api/public/projects?category=Back-end&featured=true&locale=en',
    );
    expect(res.status).toBe(200);
    expect(spies.listProjects).toHaveBeenCalledWith({
      locale: 'en',
      category: 'Back-end',
      featured: true,
    });
    expect(res.body.data).toHaveLength(1);
  });

  it('utilise le français par défaut', async () => {
    const { app, spies } = createTestApp();
    await request(app).get('/api/public/projects');
    expect(spies.listProjects).toHaveBeenCalledWith(expect.objectContaining({ locale: 'fr' }));
  });

  it('refuse une langue ou un filtre invalide (400 avec le détail par champ)', async () => {
    const { app } = createTestApp();
    const badLocale = await request(app).get('/api/public/projects?locale=de');
    expect(badLocale.status).toBe(400);
    expect(badLocale.body.error.code).toBe('VALIDATION_ERROR');
    expect(badLocale.body.error.fields.locale).toBeDefined();

    const badFeatured = await request(app).get('/api/public/projects?featured=peut-etre');
    expect(badFeatured.status).toBe(400);

    const repeated = await request(app).get('/api/public/projects?locale=fr&locale=en');
    expect(repeated.status).toBe(400);
  });

  it('renvoie le détail d’un projet', async () => {
    const { app } = createTestApp();
    const res = await request(app).get('/api/public/projects/api-gestion-stock');
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('API REST de gestion de stock');
    expect(res.body.data.technologies).toEqual(['Node.js', 'Express', 'MySQL']);
  });

  it('renvoie 404 pour un projet inconnu', async () => {
    const { app } = createTestApp();
    const res = await request(app).get('/api/public/projects/projet-inconnu');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('rejette un identifiant d’URL suspect sans interroger la base', async () => {
    const { app, spies } = createTestApp();
    const suspicious = ["x' OR '1'='1", '../../etc/passwd', 'A_B', '-debut', 'a'.repeat(200)];
    for (const slug of suspicious) {
      const res = await request(app).get(`/api/public/projects/${encodeURIComponent(slug)}`);
      expect(res.status, slug).toBe(400);
    }
    expect(spies.getProject).not.toHaveBeenCalled();
  });

  it('renvoie le profil, les compétences, les articles, les réglages et l’état du CV', async () => {
    const { app } = createTestApp();
    expect((await request(app).get('/api/public/profile')).body.data.displayName).toBe(
      'Mouhamed Diagne',
    );
    expect((await request(app).get('/api/public/skills')).body.data[0].category).toBe('Front-end');
    expect((await request(app).get('/api/public/articles')).body.data).toHaveLength(1);
    expect((await request(app).get('/api/public/articles/premier-article')).body.data.content).toBe(
      'Contenu.',
    );
    expect((await request(app).get('/api/public/articles/inconnu')).status).toBe(404);
    expect((await request(app).get('/api/public/settings')).body.data['site.default_theme']).toBe(
      'dark',
    );
    expect((await request(app).get('/api/public/cv')).body.data).toEqual({
      available: false,
      updatedAt: null,
    });
  });

  it('renvoie 404 si le profil n’est pas encore configuré', async () => {
    const { app } = createTestApp({
      content: {
        ...createTestApp().deps.content,
        getProfile: async () => null,
      },
    });
    const res = await request(app).get('/api/public/profile');
    expect(res.status).toBe(404);
  });

  it('n’autorise que la lecture (pas d’écriture publique)', async () => {
    const { app } = createTestApp();
    for (const method of ['post', 'put', 'patch', 'delete'] as const) {
      const res = await request(app)[method]('/api/public/projects').send({});
      expect(res.status, method).toBe(404);
    }
  });

  it('renvoie une erreur 500 générique, sans détail interne, si la base échoue', async () => {
    const { app } = createTestApp({
      content: {
        ...createTestApp().deps.content,
        listProjects: async () => {
          throw new Error('Table portfolio.projects introuvable (utilisateur portfolio_app)');
        },
      },
    });
    const res = await request(app).get('/api/public/projects');
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
    expect(JSON.stringify(res.body)).not.toContain('portfolio_app');
    expect(JSON.stringify(res.body)).not.toContain('introuvable');
  });

  it('limite le nombre de requêtes par adresse IP (429)', async () => {
    const { app } = createTestApp({}, { rateLimits: { api: { windowMs: 60_000, limit: 2 } } });
    expect((await request(app).get('/api/public/skills')).status).toBe(200);
    expect((await request(app).get('/api/public/skills')).status).toBe(200);
    const limited = await request(app).get('/api/public/skills');
    expect(limited.status).toBe(429);
    expect(limited.body.error.code).toBe('TOO_MANY_REQUESTS');
    expect(limited.headers['retry-after']).toBe('60');
  });
});
