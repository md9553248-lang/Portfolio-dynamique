import type { Pool, RowDataPacket } from 'mysql2/promise';
import type { ContentRepository } from './content.repository.js';
import type {
  ArticleDto,
  ArticleSummaryDto,
  CertificationDto,
  EducationStatus,
  Locale,
  PublicSettings,
  SkillLevel,
  ProjectDto,
  SkillGroupDto,
} from './content.types.js';

/*
 * Implémentation MySQL des lectures publiques.
 * - Toutes les requêtes sont PRÉPARÉES (pool.execute) : aucune valeur n'est collée dans le SQL.
 * - Seuls les contenus publiés / visibles sont lus.
 * - Une traduction manquante retombe sur le français (obligatoire pour chaque contenu).
 */

type Param = string | number | null;

const SEPARATOR = '||';

async function select(pool: Pool, sql: string, params: Param[] = []): Promise<RowDataPacket[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(sql, params);
  return rows;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function nullableText(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null;
}

function flag(value: unknown): boolean {
  return Number(value) === 1;
}

function splitList(value: unknown): string[] {
  return typeof value === 'string' && value !== '' ? value.split(SEPARATOR) : [];
}

function splitParagraphs(value: unknown): string[] {
  return text(value)
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter((part) => part !== '');
}

/** MySQL renvoie une colonne JSON déjà décodée ou sous forme de texte, selon la requête. */
function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value === null || value === undefined ? fallback : (value as T);
}

function mediaUrl(storageKey: unknown): string {
  return `/api/public/media/${text(storageKey)}`;
}

const PROJECT_SELECT = `
  SELECT p.id, p.slug, p.category, DATE_FORMAT(p.project_date, '%Y-%m') AS date_month,
         p.github_url, p.demo_url, p.is_featured, p.is_demo,
         COALESCE(t.title, f.title) AS title,
         COALESCE(t.short_description, f.short_description) AS short_description,
         COALESCE(t.description, f.description) AS description,
         COALESCE(t.role, f.role) AS role,
         COALESCE(t.challenges, f.challenges) AS challenges,
         c.storage_key AS cover_key, c.alt_text AS cover_alt,
         (SELECT GROUP_CONCAT(tech.name ORDER BY pt.sort_order, tech.name SEPARATOR '${SEPARATOR}')
            FROM project_technologies pt
            JOIN technologies tech ON tech.id = pt.technology_id
           WHERE pt.project_id = p.id) AS technologies
    FROM projects p
    LEFT JOIN project_translations t ON t.project_id = p.id AND t.locale = ?
    JOIN project_translations f ON f.project_id = p.id AND f.locale = 'fr'
    LEFT JOIN media c ON c.id = p.cover_media_id AND c.visibility = 'public'
   WHERE p.status = 'published'`;

const PROJECT_ORDER = ' ORDER BY p.sort_order ASC, p.project_date DESC, p.id DESC';

function toProject(row: RowDataPacket): ProjectDto {
  const project: ProjectDto = {
    slug: text(row['slug']),
    title: text(row['title']),
    shortDescription: text(row['short_description']),
    description: splitParagraphs(row['description']),
    category: text(row['category']),
    date: text(row['date_month']),
    role: nullableText(row['role']),
    technologies: splitList(row['technologies']),
    challenges: parseJson<Array<{ problem: string; solution: string }>>(row['challenges'], []),
    cover: row['cover_key']
      ? { src: mediaUrl(row['cover_key']), alt: text(row['cover_alt']) }
      : null,
    gallery: [],
    featured: flag(row['is_featured']),
    demo: flag(row['is_demo']),
  };
  const githubUrl = nullableText(row['github_url']);
  const demoUrl = nullableText(row['demo_url']);
  if (githubUrl) project.githubUrl = githubUrl;
  if (demoUrl) project.demoUrl = demoUrl;
  return project;
}

export function createMysqlContentRepository(pool: Pool): ContentRepository {
  return {
    async getProfile(locale: Locale) {
      const rows = await select(
        pool,
        `SELECT p.display_name, p.public_email, p.public_phone,
                m.storage_key AS photo_key, m.alt_text AS photo_alt,
                COALESCE(t.headline, f.headline) AS headline,
                COALESCE(t.context, f.context) AS context,
                COALESCE(t.intro, f.intro) AS intro,
                COALESCE(t.about, f.about) AS about
           FROM profile p
           LEFT JOIN media m ON m.id = p.photo_media_id AND m.visibility = 'public'
           LEFT JOIN profile_translations t ON t.profile_id = p.id AND t.locale = ?
           JOIN profile_translations f ON f.profile_id = p.id AND f.locale = 'fr'
          WHERE p.id = 1`,
        [locale],
      );
      const row = rows[0];
      if (!row) return null;

      const links = await select(
        pool,
        'SELECT platform, url FROM social_links WHERE is_visible = 1 ORDER BY sort_order, id',
      );
      return {
        displayName: text(row['display_name']),
        headline: text(row['headline']),
        context: nullableText(row['context']),
        intro: nullableText(row['intro']),
        about: splitParagraphs(row['about']),
        publicEmail: nullableText(row['public_email']),
        publicPhone: nullableText(row['public_phone']),
        photo: row['photo_key']
          ? { src: mediaUrl(row['photo_key']), alt: text(row['photo_alt']) }
          : null,
        socialLinks: links.map((link) => ({
          platform: text(link['platform']),
          url: text(link['url']),
        })),
      };
    },

    async listProjects({ locale, category, featured }) {
      const conditions: string[] = [];
      const params: Param[] = [locale];
      if (category !== undefined) {
        conditions.push('p.category = ?');
        params.push(category);
      }
      if (featured !== undefined) {
        conditions.push('p.is_featured = ?');
        params.push(featured ? 1 : 0);
      }
      const where = conditions.length > 0 ? ` AND ${conditions.join(' AND ')}` : '';
      const rows = await select(pool, PROJECT_SELECT + where + PROJECT_ORDER, params);
      return rows.map(toProject);
    },

    async getProject(slug: string, locale: Locale) {
      const rows = await select(pool, `${PROJECT_SELECT} AND p.slug = ?`, [locale, slug]);
      const row = rows[0];
      if (!row) return null;

      const project = toProject(row);
      const images = await select(
        pool,
        `SELECT m.storage_key, m.alt_text
           FROM project_images pi
           JOIN media m ON m.id = pi.media_id AND m.visibility = 'public'
          WHERE pi.project_id = ?
          ORDER BY pi.sort_order, pi.id`,
        [Number(row['id'])],
      );
      project.gallery = images.map((image) => ({
        src: mediaUrl(image['storage_key']),
        alt: text(image['alt_text']),
      }));
      return project;
    },

    async listSkills(): Promise<SkillGroupDto[]> {
      const rows = await select(
        pool,
        `SELECT c.name AS category, s.name, s.level, s.icon, s.is_demo
           FROM skills s
           JOIN skill_categories c ON c.id = s.category_id
          WHERE s.is_visible = 1
          ORDER BY c.sort_order, c.id, s.sort_order, s.name`,
      );
      const groups: SkillGroupDto[] = [];
      for (const row of rows) {
        const category = text(row['category']);
        let group = groups.find((candidate) => candidate.category === category);
        if (!group) {
          group = { category, skills: [] };
          groups.push(group);
        }
        group.skills.push({
          name: text(row['name']),
          level: nullableText(row['level']) as SkillLevel | null,
          icon: nullableText(row['icon']),
          demo: flag(row['is_demo']),
        });
      }
      return groups;
    },

    async listExperiences(locale: Locale) {
      const rows = await select(
        pool,
        `SELECT e.id, e.organization, e.is_demo,
                DATE_FORMAT(e.start_date, '%Y-%m') AS start_month,
                DATE_FORMAT(e.end_date, '%Y-%m') AS end_month,
                COALESCE(t.role, f.role) AS role,
                COALESCE(t.description, f.description) AS description,
                COALESCE(t.missions, f.missions) AS missions,
                (SELECT GROUP_CONCAT(tech.name ORDER BY tech.name SEPARATOR '${SEPARATOR}')
                   FROM experience_technologies et
                   JOIN technologies tech ON tech.id = et.technology_id
                  WHERE et.experience_id = e.id) AS technologies
           FROM experiences e
           LEFT JOIN experience_translations t ON t.experience_id = e.id AND t.locale = ?
           JOIN experience_translations f ON f.experience_id = e.id AND f.locale = 'fr'
          WHERE e.is_visible = 1
          ORDER BY e.sort_order ASC, e.start_date DESC, e.id DESC`,
        [locale],
      );
      return rows.map((row) => ({
        id: Number(row['id']),
        role: text(row['role']),
        organization: text(row['organization']),
        startMonth: text(row['start_month']),
        endMonth: nullableText(row['end_month']),
        description: nullableText(row['description']),
        missions: parseJson<string[]>(row['missions'], []),
        technologies: splitList(row['technologies']),
        demo: flag(row['is_demo']),
      }));
    },

    async listEducations(locale: Locale) {
      const rows = await select(
        pool,
        `SELECT d.id, d.institution, d.status,
                DATE_FORMAT(d.start_date, '%Y-%m') AS start_month,
                DATE_FORMAT(d.end_date, '%Y-%m') AS end_month,
                COALESCE(t.degree, f.degree) AS degree,
                COALESCE(t.description, f.description) AS description
           FROM educations d
           LEFT JOIN education_translations t ON t.education_id = d.id AND t.locale = ?
           JOIN education_translations f ON f.education_id = d.id AND f.locale = 'fr'
          WHERE d.is_visible = 1
          ORDER BY d.sort_order ASC, d.start_date DESC, d.id DESC`,
        [locale],
      );
      return rows.map((row) => ({
        id: Number(row['id']),
        institution: text(row['institution']),
        degree: text(row['degree']),
        status: text(row['status']) as EducationStatus,
        startMonth: nullableText(row['start_month']),
        endMonth: nullableText(row['end_month']),
        description: nullableText(row['description']),
      }));
    },

    async listCertifications(): Promise<CertificationDto[]> {
      const rows = await select(
        pool,
        `SELECT id, name, issuer, credential_id, verify_url, is_demo,
                DATE_FORMAT(issued_at, '%Y-%m') AS issued_month,
                DATE_FORMAT(expires_at, '%Y-%m') AS expires_month
           FROM certifications
          WHERE is_visible = 1
          ORDER BY sort_order ASC, issued_at DESC, id DESC`,
      );
      return rows.map((row) => ({
        id: Number(row['id']),
        name: text(row['name']),
        issuer: text(row['issuer']),
        issuedMonth: text(row['issued_month']),
        expiresMonth: nullableText(row['expires_month']),
        credentialId: nullableText(row['credential_id']),
        verifyUrl: nullableText(row['verify_url']),
        demo: flag(row['is_demo']),
      }));
    },

    async listArticles(locale: Locale): Promise<ArticleSummaryDto[]> {
      const rows = await select(
        pool,
        `SELECT a.slug, a.is_demo, cat.name AS category,
                DATE_FORMAT(a.published_at, '%Y-%m-%d') AS published_day,
                COALESCE(t.title, f.title) AS title,
                COALESCE(t.excerpt, f.excerpt) AS excerpt
           FROM articles a
           LEFT JOIN article_categories cat ON cat.id = a.category_id
           LEFT JOIN article_translations t ON t.article_id = a.id AND t.locale = ?
           JOIN article_translations f ON f.article_id = a.id AND f.locale = 'fr'
          WHERE a.status = 'published'
          ORDER BY a.published_at DESC, a.id DESC`,
        [locale],
      );
      return rows.map((row) => ({
        slug: text(row['slug']),
        title: text(row['title']),
        excerpt: text(row['excerpt']),
        date: text(row['published_day']),
        category: nullableText(row['category']),
        demo: flag(row['is_demo']),
      }));
    },

    async getArticle(slug: string, locale: Locale): Promise<ArticleDto | null> {
      const rows = await select(
        pool,
        `SELECT a.slug, a.is_demo, cat.name AS category,
                DATE_FORMAT(a.published_at, '%Y-%m-%d') AS published_day,
                COALESCE(t.title, f.title) AS title,
                COALESCE(t.excerpt, f.excerpt) AS excerpt,
                COALESCE(t.content_markdown, f.content_markdown) AS content,
                COALESCE(t.seo_title, f.seo_title) AS seo_title,
                COALESCE(t.seo_description, f.seo_description) AS seo_description
           FROM articles a
           LEFT JOIN article_categories cat ON cat.id = a.category_id
           LEFT JOIN article_translations t ON t.article_id = a.id AND t.locale = ?
           JOIN article_translations f ON f.article_id = a.id AND f.locale = 'fr'
          WHERE a.status = 'published' AND a.slug = ?`,
        [locale, slug],
      );
      const row = rows[0];
      if (!row) return null;
      return {
        slug: text(row['slug']),
        title: text(row['title']),
        excerpt: text(row['excerpt']),
        date: text(row['published_day']),
        category: nullableText(row['category']),
        demo: flag(row['is_demo']),
        content: text(row['content']),
        seoTitle: nullableText(row['seo_title']),
        seoDescription: nullableText(row['seo_description']),
      };
    },

    async getPublicSettings(): Promise<PublicSettings> {
      const rows = await select(
        pool,
        'SELECT setting_key, setting_value, value_type FROM site_settings WHERE is_public = 1 ORDER BY setting_key',
      );
      const settings: PublicSettings = {};
      for (const row of rows) {
        const raw = text(row['setting_value']);
        switch (text(row['value_type'])) {
          case 'number':
            settings[text(row['setting_key'])] = Number(raw);
            break;
          case 'boolean':
            settings[text(row['setting_key'])] = raw === 'true';
            break;
          case 'json':
            settings[text(row['setting_key'])] = parseJson<unknown[] | object>(raw, []);
            break;
          default:
            settings[text(row['setting_key'])] = raw;
        }
      }
      return settings;
    },

    async getCvStatus() {
      const rows = await select(
        pool,
        `SELECT DATE_FORMAT(published_at, '%Y-%m-%dT%H:%i:%sZ') AS updated_at
           FROM cv_versions WHERE status = 'published' LIMIT 1`,
      );
      const row = rows[0];
      return { available: Boolean(row), updatedAt: row ? nullableText(row['updated_at']) : null };
    },
  };
}
