import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import type { Connection, Pool, RowDataPacket } from 'mysql2/promise';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadMigrationFiles, runMigrations } from '../../src/db/migrator.js';
import { createMysqlContactRepository } from '../../src/modules/contact/contact.mysql.js';
import { createMysqlContentRepository } from '../../src/modules/content/content.mysql.js';
import type { ContentRepository } from '../../src/modules/content/content.repository.js';
import { seedDemoData } from '../../src/seed/seed-demo.js';
import { appOptions, dbTestEnabled, migratorOptions, resetDatabase } from '../helpers/db.js';

const MIGRATIONS_DIR = fileURLToPath(new URL('../../db/migrations', import.meta.url));

/*
 * Vérifie les VRAIES requêtes SQL sur MySQL, avec le compte de l'application.
 * Ignoré tant que DB_TEST_NAME (se terminant par _test) n'est pas défini dans server/.env.
 */
describe.skipIf(!dbTestEnabled)('Lectures publiques et contact sur MySQL (intégration)', () => {
  let admin: Connection;
  let pool: Pool;
  let content: ContentRepository;

  beforeAll(async () => {
    admin = await mysql.createConnection(migratorOptions());
    await resetDatabase(admin);
    await runMigrations(admin, await loadMigrationFiles(MIGRATIONS_DIR));
    await seedDemoData(admin);

    pool = mysql.createPool(appOptions());
    content = createMysqlContentRepository(pool);
  });

  afterAll(async () => {
    await pool?.end();
    await admin?.end();
  });

  it('liste uniquement les projets publiés, dans l’ordre prévu', async () => {
    const projects = await content.listProjects({ locale: 'fr' });
    expect(projects.map((project) => project.slug)).toEqual([
      'api-gestion-stock',
      'tableau-de-bord-statistiques',
      'application-mobile-suivi-taches',
      'site-vitrine-association',
    ]);
  });

  it('renvoie les champs d’un projet correctement transformés', async () => {
    const project = await content.getProject('api-gestion-stock', 'fr');
    expect(project).not.toBeNull();
    expect(project?.date).toBe('2026-06');
    expect(project?.technologies).toEqual(['Node.js', 'Express', 'MySQL']);
    expect(project?.description).toHaveLength(2);
    expect(project?.challenges).toHaveLength(1);
    expect(project?.challenges[0]?.problem).toContain('stocks négatifs');
    expect(project?.demo).toBe(true);
    expect(project?.gallery).toEqual([]);
  });

  it('filtre par catégorie et par « mis en avant »', async () => {
    expect(await content.listProjects({ locale: 'fr', category: 'Front-end' })).toHaveLength(2);
    expect(await content.listProjects({ locale: 'fr', featured: true })).toHaveLength(3);
  });

  it('retombe sur le français quand la traduction demandée n’existe pas', async () => {
    const english = await content.getProject('api-gestion-stock', 'en');
    const french = await content.getProject('api-gestion-stock', 'fr');
    expect(english?.title).toBe(french?.title);
  });

  it('ne renvoie jamais un brouillon ni un identifiant inconnu, même avec un texte d’injection', async () => {
    expect(await content.getProject('projet-en-brouillon', 'fr')).toBeNull();
    expect(await content.getProject("x' OR '1'='1", 'fr')).toBeNull();
    expect(await content.getProject('inconnu', 'fr')).toBeNull();
  });

  it('regroupe les compétences visibles par catégorie, dans l’ordre', async () => {
    const groups = await content.listSkills();
    expect(groups.map((group) => group.category)).toEqual([
      'Front-end',
      'Back-end',
      'Bases de données',
      'Outils',
    ]);
    const names = groups.flatMap((group) => group.skills.map((skill) => skill.name));
    expect(names).toContain('React');
    expect(names).not.toContain('Compétence masquée');
  });

  it('renvoie l’expérience, la formation et la certification', async () => {
    const [experience] = await content.listExperiences('fr');
    expect(experience?.startMonth).toBe('2025-07');
    expect(experience?.endMonth).toBe('2025-09');
    expect(experience?.missions).toHaveLength(2);
    expect(experience?.technologies).toEqual(['MySQL', 'Node.js', 'React']);

    const [education] = await content.listEducations('fr');
    expect(education?.status).toBe('in_progress');
    expect(education?.institution).toContain('Bambey');

    const [certification] = await content.listCertifications();
    expect(certification?.issuedMonth).toBe('2026-03');
    expect(certification?.expiresMonth).toBe('2029-03');
  });

  it('liste les articles publiés du plus récent au plus ancien et cache les brouillons', async () => {
    const articles = await content.listArticles('fr');
    expect(articles.map((article) => article.slug)).toEqual([
      'premiers-pas-api-securisee',
      'organiser-un-projet-react',
    ]);
    expect((await content.getArticle('premiers-pas-api-securisee', 'fr'))?.content).toContain(
      'API',
    );
    expect(await content.getArticle('article-en-brouillon', 'fr')).toBeNull();
  });

  it('renvoie le profil réel avec son lien social', async () => {
    const profile = await content.getProfile('fr');
    expect(profile?.displayName).toBe('Mouhamed Diagne');
    expect(profile?.about).toHaveLength(2);
    expect(profile?.socialLinks).toHaveLength(1);
    expect(profile?.socialLinks[0]?.url.startsWith('https://')).toBe(true);
  });

  it('renvoie les réglages publics typés et l’état du CV', async () => {
    const settings = await content.getPublicSettings();
    expect(settings['site.default_theme']).toBe('dark');
    expect(settings['site.enabled_locales']).toEqual(['fr']);
    expect(await content.getCvStatus()).toEqual({ available: false, updatedAt: null });
  });

  it('enregistre un message de contact avec le compte de l’application', async () => {
    const id = await createMysqlContactRepository(pool).insertMessage({
      name: 'Awa Ndiaye',
      email: 'awa@exemple.com',
      subject: 'Sujet de test',
      body: 'Un message de test avec des accents : éàç 🙂',
      ipHash: 'a'.repeat(64),
    });
    expect(id).toBeGreaterThan(0);

    const [rows] = await admin.execute<RowDataPacket[]>(
      'SELECT status, body, ip_hash FROM messages WHERE id = ?',
      [id],
    );
    expect(rows[0]?.['status']).toBe('unread');
    expect(rows[0]?.['body']).toContain('🙂');
    expect(rows[0]?.['ip_hash']).toBe('a'.repeat(64));
  });

  it('ne réinsère pas les données de démonstration deux fois, sauf avec reset', async () => {
    expect(await seedDemoData(admin)).toBe(false);
    expect(await seedDemoData(admin, { reset: true })).toBe(true);
    expect(await content.listProjects({ locale: 'fr' })).toHaveLength(4);
  });
});
