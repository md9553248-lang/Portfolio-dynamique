/** Formes de données renvoyées par l'API publique (voir docs/api.md). */

export type Locale = 'fr' | 'en';
export type SkillLevel = 'notions' | 'intermediaire' | 'avance';
export type EducationStatus = 'planned' | 'in_progress' | 'completed';

export interface MediaRef {
  src: string;
  alt: string;
}

export interface ProfileDto {
  displayName: string;
  headline: string;
  context: string | null;
  intro: string | null;
  about: string[];
  publicEmail: string | null;
  publicPhone: string | null;
  photo: MediaRef | null;
  socialLinks: Array<{ platform: string; url: string }>;
}

export interface ProjectDto {
  slug: string;
  title: string;
  shortDescription: string;
  description: string[];
  category: string;
  /** Format AAAA-MM */
  date: string;
  role: string | null;
  technologies: string[];
  challenges: Array<{ problem: string; solution: string }>;
  githubUrl?: string;
  demoUrl?: string;
  cover: MediaRef | null;
  gallery: MediaRef[];
  featured: boolean;
  demo: boolean;
}

export interface SkillGroupDto {
  category: string;
  skills: Array<{ name: string; level: SkillLevel | null; icon: string | null; demo: boolean }>;
}

export interface ExperienceDto {
  id: number;
  role: string;
  organization: string;
  startMonth: string;
  endMonth: string | null;
  description: string | null;
  missions: string[];
  technologies: string[];
  demo: boolean;
}

export interface EducationDto {
  id: number;
  institution: string;
  degree: string;
  status: EducationStatus;
  startMonth: string | null;
  endMonth: string | null;
  description: string | null;
}

export interface CertificationDto {
  id: number;
  name: string;
  issuer: string;
  issuedMonth: string;
  expiresMonth: string | null;
  credentialId: string | null;
  verifyUrl: string | null;
  demo: boolean;
}

export interface ArticleSummaryDto {
  slug: string;
  title: string;
  excerpt: string;
  /** Format AAAA-MM-JJ */
  date: string;
  category: string | null;
  demo: boolean;
}

export interface ArticleDto extends ArticleSummaryDto {
  /** Markdown brut : toujours nettoyé avant d'être affiché. */
  content: string;
  seoTitle: string | null;
  seoDescription: string | null;
}

export type PublicSettings = Record<string, string | number | boolean | unknown[] | object | null>;

export interface CvStatusDto {
  available: boolean;
  /** Date de publication (ISO 8601, UTC), si un CV est publié. */
  updatedAt: string | null;
}
