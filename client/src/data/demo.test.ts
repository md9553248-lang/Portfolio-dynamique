import { describe, expect, it } from 'vitest';
import { articles, certifications, education, experiences, projects, skills } from './demo';

describe('données de démonstration', () => {
  it('utilise des identifiants d’URL uniques', () => {
    const projectSlugs = projects.map((project) => project.slug);
    const articleSlugs = articles.map((article) => article.slug);
    expect(new Set(projectSlugs).size).toBe(projectSlugs.length);
    expect(new Set(articleSlugs).size).toBe(articleSlugs.length);
  });

  it('signale comme démonstration tout ce qui est fictif', () => {
    for (const item of [...projects, ...skills, ...experiences, ...certifications, ...articles]) {
      expect(item.demo).toBe(true);
    }
  });

  it('garde les informations de formation réelles hors du périmètre « démo »', () => {
    expect(education.every((item) => !item.demo)).toBe(true);
  });

  it('contient au moins trois projets publiés et mis en avant pour l’accueil', () => {
    const featured = projects.filter((project) => project.status === 'published' && project.featured);
    expect(featured.length).toBeGreaterThanOrEqual(3);
  });

  it('prévoit un brouillon de projet et d’article pour vérifier leur masquage', () => {
    expect(projects.some((project) => project.status === 'draft')).toBe(true);
    expect(articles.some((article) => article.status === 'draft')).toBe(true);
  });

  it('utilise des dates au bon format', () => {
    for (const project of projects) expect(project.date).toMatch(/^\d{4}-\d{2}$/);
    for (const article of articles) expect(article.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
