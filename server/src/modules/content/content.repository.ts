import type {
  ArticleDto,
  ArticleSummaryDto,
  CertificationDto,
  CvStatusDto,
  EducationDto,
  ExperienceDto,
  Locale,
  ProfileDto,
  ProjectDto,
  PublicSettings,
  SkillGroupDto,
} from './content.types.js';

/** Accès aux contenus publiés. L'implémentation MySQL est dans content.mysql.ts. */
export interface ContentRepository {
  getProfile(locale: Locale): Promise<ProfileDto | null>;
  listProjects(options: {
    locale: Locale;
    category?: string | undefined;
    featured?: boolean | undefined;
  }): Promise<ProjectDto[]>;
  getProject(slug: string, locale: Locale): Promise<ProjectDto | null>;
  listSkills(): Promise<SkillGroupDto[]>;
  listExperiences(locale: Locale): Promise<ExperienceDto[]>;
  listEducations(locale: Locale): Promise<EducationDto[]>;
  listCertifications(): Promise<CertificationDto[]>;
  listArticles(locale: Locale): Promise<ArticleSummaryDto[]>;
  getArticle(slug: string, locale: Locale): Promise<ArticleDto | null>;
  getPublicSettings(): Promise<PublicSettings>;
  getCvStatus(): Promise<CvStatusDto>;
}
