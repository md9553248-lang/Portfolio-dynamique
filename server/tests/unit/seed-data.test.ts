import { describe, expect, it } from 'vitest';
import {
  DEMO_ARTICLES,
  DEMO_PROJECTS,
  DEMO_SKILLS,
  REAL_PROFILE,
} from '../../src/seed/demo-data.js';

const DEFAULT_CATEGORIES = ['Front-end', 'Back-end', 'Bases de données', 'Outils'];

describe('données de démonstration', () => {
  it('utilisent des identifiants d’URL uniques et valides', () => {
    for (const items of [DEMO_PROJECTS, DEMO_ARTICLES]) {
      const slugs = items.map((item) => item.slug);
      expect(new Set(slugs).size).toBe(slugs.length);
      slugs.forEach((slug) => expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/));
    }
  });

  it('contiennent un brouillon de projet, un brouillon d’article et une compétence masquée', () => {
    expect(DEMO_PROJECTS.some((project) => !project.published)).toBe(true);
    expect(DEMO_ARTICLES.some((article) => !article.published)).toBe(true);
    expect(DEMO_SKILLS.some((skill) => !skill.visible)).toBe(true);
  });

  it('n’utilisent que des catégories de compétences créées par la migration 0006', () => {
    for (const skill of DEMO_SKILLS) expect(DEFAULT_CATEGORIES).toContain(skill.category);
  });

  it('utilisent uniquement des liens https pour le profil réel', () => {
    for (const link of REAL_PROFILE.socialLinks) expect(link.url.startsWith('https://')).toBe(true);
  });
});
