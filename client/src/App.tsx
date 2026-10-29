import { Route, Routes } from 'react-router-dom';
import { RootLayout } from './app/RootLayout';
import { StyleGuidePage } from './features/style-guide/StyleGuidePage';
import { AboutPage } from './features/public/pages/AboutPage';
import { ArticlePage } from './features/public/pages/ArticlePage';
import { CertificationsPage } from './features/public/pages/CertificationsPage';
import { ContactPage } from './features/public/pages/ContactPage';
import { EducationPage } from './features/public/pages/EducationPage';
import { ExperiencesPage } from './features/public/pages/ExperiencesPage';
import { HomePage } from './features/public/pages/HomePage';
import { LegalPage } from './features/public/pages/LegalPage';
import { NewsPage } from './features/public/pages/NewsPage';
import { NotFoundPage } from './features/public/pages/NotFoundPage';
import { PrivacyPage } from './features/public/pages/PrivacyPage';
import { ProjectDetailPage } from './features/public/pages/ProjectDetailPage';
import { ProjectsPage } from './features/public/pages/ProjectsPage';
import { SkillsPage } from './features/public/pages/SkillsPage';

/** Routes du site public. Les URLs sont en français et lisibles. */
export default function App() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route index element={<HomePage />} />
        <Route path="a-propos" element={<AboutPage />} />
        <Route path="projets" element={<ProjectsPage />} />
        <Route path="projets/:slug" element={<ProjectDetailPage />} />
        <Route path="competences" element={<SkillsPage />} />
        <Route path="experiences" element={<ExperiencesPage />} />
        <Route path="formations" element={<EducationPage />} />
        <Route path="certifications" element={<CertificationsPage />} />
        <Route path="actualites" element={<NewsPage />} />
        <Route path="actualites/:slug" element={<ArticlePage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="confidentialite" element={<PrivacyPage />} />
        <Route path="mentions-legales" element={<LegalPage />} />
        <Route path="guide-de-style" element={<StyleGuidePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
