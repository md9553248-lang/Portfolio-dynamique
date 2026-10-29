import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { ErrorBoundary, SiteLayout } from '../components/layout';
import { site } from '../data/site';
import { LEGAL_LINKS, NAV_LINKS } from './navigation';

/** Mise en page commune : à chaque changement de page, retour en haut et focus sur le contenu. */
export function RootLayout() {
  const { pathname } = useLocation();
  const previousPath = useRef(pathname);

  useEffect(() => {
    if (previousPath.current === pathname) return;
    previousPath.current = pathname;
    window.scrollTo(0, 0);
    document.getElementById('contenu')?.focus({ preventScroll: true });
  }, [pathname]);

  return (
    <SiteLayout
      siteName={site.name}
      tagline={`${site.title} · ${site.context}`}
      navLinks={NAV_LINKS}
      legalLinks={LEGAL_LINKS}
      socialLinks={site.social}
    >
      {/* key : l'erreur d'une page est effacée dès qu'on navigue vers une autre page. */}
      <ErrorBoundary key={pathname}>
        <Outlet />
      </ErrorBoundary>
    </SiteLayout>
  );
}
