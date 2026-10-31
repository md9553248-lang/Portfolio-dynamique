import type { Connection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import {
  DEMO_ARTICLES,
  DEMO_CERTIFICATION,
  DEMO_EXPERIENCE,
  DEMO_PROJECTS,
  DEMO_SKILLS,
  REAL_EDUCATION,
  REAL_PROFILE,
} from './demo-data.js';

type Param = string | number | null;

async function insert(connection: Connection, sql: string, params: Param[]): Promise<number> {
  const [result] = await connection.execute<ResultSetHeader>(sql, params);
  return result.insertId;
}

async function count(connection: Connection, sql: string): Promise<number> {
  const [rows] = await connection.query<RowDataPacket[]>(sql);
  return Number(rows[0]?.['total'] ?? 0);
}

/** Crée la technologie si elle n'existe pas et renvoie son identifiant. */
function technologyId(connection: Connection, name: string): Promise<number> {
  return insert(
    connection,
    'INSERT INTO technologies (name) VALUES (?) ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)',
    [name],
  );
}

/** Supprime uniquement les contenus marqués « démo » (les traductions suivent par cascade). */
export async function removeDemoData(connection: Connection): Promise<void> {
  for (const table of ['projects', 'skills', 'experiences', 'certifications', 'articles']) {
    await connection.query(`DELETE FROM ${table} WHERE is_demo = 1`);
  }
}

/**
 * Insère les contenus de démonstration et, s'ils n'existent pas encore, le profil et la formation réels.
 * Tout se fait dans une transaction : en cas d'erreur, rien n'est enregistré.
 * Renvoie false si les données de démonstration sont déjà présentes (et que `reset` est faux).
 */
export async function seedDemoData(
  connection: Connection,
  options: { reset?: boolean } = {},
): Promise<boolean> {
  await connection.beginTransaction();
  try {
    if (options.reset) await removeDemoData(connection);

    if ((await count(connection, 'SELECT COUNT(*) AS total FROM projects WHERE is_demo = 1')) > 0) {
      await connection.rollback();
      return false;
    }

    // --- Profil et formation réels : créés seulement s'ils n'existent pas ---
    if ((await count(connection, 'SELECT COUNT(*) AS total FROM profile')) === 0) {
      await connection.execute('INSERT INTO profile (id, display_name) VALUES (1, ?)', [
        REAL_PROFILE.displayName,
      ]);
      await connection.execute(
        "INSERT INTO profile_translations (profile_id, locale, headline, context, intro, about) VALUES (1, 'fr', ?, ?, ?, ?)",
        [
          REAL_PROFILE.headline,
          REAL_PROFILE.context,
          REAL_PROFILE.intro,
          REAL_PROFILE.about.join('\n\n'),
        ],
      );
    }
    if ((await count(connection, 'SELECT COUNT(*) AS total FROM social_links')) === 0) {
      for (const [index, link] of REAL_PROFILE.socialLinks.entries()) {
        await insert(
          connection,
          'INSERT INTO social_links (platform, url, sort_order) VALUES (?, ?, ?)',
          [link.platform, link.url, index],
        );
      }
    }
    if ((await count(connection, 'SELECT COUNT(*) AS total FROM educations')) === 0) {
      const educationId = await insert(
        connection,
        "INSERT INTO educations (institution, status) VALUES (?, 'in_progress')",
        [REAL_EDUCATION.institution],
      );
      await connection.execute(
        "INSERT INTO education_translations (education_id, locale, degree, description) VALUES (?, 'fr', ?, ?)",
        [educationId, REAL_EDUCATION.degree, REAL_EDUCATION.description],
      );
    }

    // --- Projets ---
    for (const [index, project] of DEMO_PROJECTS.entries()) {
      const projectId = await insert(
        connection,
        `INSERT INTO projects (slug, category, project_date, status, is_featured, is_demo, sort_order, published_at)
         VALUES (?, ?, ?, ?, ?, 1, ?, ${project.published ? 'UTC_TIMESTAMP()' : 'NULL'})`,
        [
          project.slug,
          project.category,
          project.date,
          project.published ? 'published' : 'draft',
          project.featured ? 1 : 0,
          index,
        ],
      );
      await connection.execute(
        `INSERT INTO project_translations (project_id, locale, title, short_description, description, role, challenges)
         VALUES (?, 'fr', ?, ?, ?, ?, ?)`,
        [
          projectId,
          project.title,
          project.shortDescription,
          project.description.join('\n\n'),
          project.role,
          JSON.stringify(project.challenges),
        ],
      );
      for (const [order, name] of project.technologies.entries()) {
        const techId = await technologyId(connection, name);
        await connection.execute(
          'INSERT INTO project_technologies (project_id, technology_id, sort_order) VALUES (?, ?, ?)',
          [projectId, techId, order],
        );
      }
    }

    // --- Compétences ---
    for (const [index, skill] of DEMO_SKILLS.entries()) {
      const [categories] = await connection.execute<RowDataPacket[]>(
        'SELECT id FROM skill_categories WHERE name = ?',
        [skill.category],
      );
      const categoryId = categories[0]?.['id'];
      if (categoryId === undefined) {
        throw new Error(`Catégorie de compétences introuvable : ${skill.category}`);
      }
      await connection.execute(
        'INSERT INTO skills (category_id, name, level, sort_order, is_visible, is_demo) VALUES (?, ?, ?, ?, ?, 1)',
        [Number(categoryId), skill.name, skill.level, index, skill.visible ? 1 : 0],
      );
    }

    // --- Expérience ---
    const experienceId = await insert(
      connection,
      'INSERT INTO experiences (organization, start_date, end_date, is_demo) VALUES (?, ?, ?, 1)',
      [DEMO_EXPERIENCE.organization, DEMO_EXPERIENCE.start, DEMO_EXPERIENCE.end],
    );
    await connection.execute(
      "INSERT INTO experience_translations (experience_id, locale, role, description, missions) VALUES (?, 'fr', ?, ?, ?)",
      [
        experienceId,
        DEMO_EXPERIENCE.role,
        DEMO_EXPERIENCE.description,
        JSON.stringify(DEMO_EXPERIENCE.missions),
      ],
    );
    for (const name of DEMO_EXPERIENCE.technologies) {
      const techId = await technologyId(connection, name);
      await connection.execute(
        'INSERT INTO experience_technologies (experience_id, technology_id) VALUES (?, ?)',
        [experienceId, techId],
      );
    }

    // --- Certification ---
    await connection.execute(
      'INSERT INTO certifications (name, issuer, issued_at, expires_at, credential_id, is_demo) VALUES (?, ?, ?, ?, ?, 1)',
      [
        DEMO_CERTIFICATION.name,
        DEMO_CERTIFICATION.issuer,
        DEMO_CERTIFICATION.issued,
        DEMO_CERTIFICATION.expires,
        DEMO_CERTIFICATION.credentialId,
      ],
    );

    // --- Articles ---
    for (const article of DEMO_ARTICLES) {
      const categoryId = await insert(
        connection,
        'INSERT INTO article_categories (slug, name) VALUES (?, ?) ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)',
        [article.categorySlug, article.category],
      );
      const articleId = await insert(
        connection,
        'INSERT INTO articles (slug, category_id, status, published_at, is_demo) VALUES (?, ?, ?, ?, 1)',
        [
          article.slug,
          categoryId,
          article.published ? 'published' : 'draft',
          article.published ? article.publishedAt : null,
        ],
      );
      await connection.execute(
        "INSERT INTO article_translations (article_id, locale, title, excerpt, content_markdown) VALUES (?, 'fr', ?, ?, ?)",
        [articleId, article.title, article.excerpt, article.paragraphs.join('\n\n')],
      );
    }

    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  }
}
