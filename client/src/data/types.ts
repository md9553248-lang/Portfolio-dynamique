export type PublicationStatus = 'published' | 'draft';
export type SkillLevel = 'notions' | 'intermediaire' | 'avance';

/** `demo: true` signale un exemple fictif, à remplacer par un vrai contenu (Phase 07). */
interface DemoFlag {
  demo: boolean;
}

export interface Project extends DemoFlag {
  slug: string;
  title: string;
  shortDescription: string;
  description: string[];
  category: string;
  /** Format AAAA-MM */
  date: string;
  role: string;
  technologies: string[];
  challenges: Array<{ problem: string; solution: string }>;
  githubUrl?: string;
  demoUrl?: string;
  gallery?: Array<{ src: string; alt: string }>;
  featured: boolean;
  status: PublicationStatus;
}

export interface Skill extends DemoFlag {
  name: string;
  category: string;
  level?: SkillLevel;
  order: number;
  visible: boolean;
}

export interface Experience extends DemoFlag {
  id: string;
  role: string;
  organization: string;
  /** Format AAAA-MM */
  start: string;
  end: string | null;
  description: string;
  missions: string[];
  technologies: string[];
}

export interface Education extends DemoFlag {
  id: string;
  institution: string;
  degree: string;
  status: string;
  description: string;
}

export interface Certification extends DemoFlag {
  id: string;
  name: string;
  issuer: string;
  issuedAt: string;
  expiresAt?: string;
  credentialId?: string;
  verifyUrl?: string;
}

export interface Article extends DemoFlag {
  slug: string;
  title: string;
  excerpt: string;
  /** Format AAAA-MM-JJ */
  date: string;
  category: string;
  paragraphs: string[];
  status: PublicationStatus;
}
