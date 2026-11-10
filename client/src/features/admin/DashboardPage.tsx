import { Badge, Card, Spinner } from '../../components/ui';
import { usePageMeta } from '../../hooks/usePageMeta';
import { formatDateTime } from '../../lib/format';
import { useAdminResource } from './useAdminResource';
import styles from './pages.module.css';

interface DashboardData {
  projects: { published: number; draft: number };
  articles: { published: number; draft: number };
  messages: { total: number; unread: number };
  media: { total: number };
  cv: { publishedAt: string | null };
  security: { failedLogins24h: number };
  recentActivity: Array<{ action: string; entityType: string | null; createdAt: string; actor: string | null }>;
}

const ACTION_LABELS: Record<string, string> = {
  'cv.upload': 'CV importé',
  'cv.publish': 'CV publié',
  'cv.unpublish': 'CV masqué',
  'cv.delete': 'Version de CV supprimée',
  'media.upload': 'Fichier importé',
  'media.update': 'Fichier modifié',
  'media.replace': 'Fichier remplacé',
  'media.delete': 'Fichier supprimé',
  'auth.login': 'Connexion',
  'auth.logout': 'Déconnexion',
  'auth.password_changed': 'Mot de passe modifié',
  'admin.created': 'Compte administrateur créé',
  'admin.password_reset': 'Mot de passe réinitialisé (ligne de commande)',
};

export function DashboardPage() {
  usePageMeta('Tableau de bord');
  const resource = useAdminResource<DashboardData>('/api/admin/dashboard');

  return (
    <div className={styles.page}>
      <h1>Tableau de bord</h1>

      {resource.status === 'loading' && <Spinner label="Chargement des statistiques…" />}
      {resource.status === 'error' && (
        <p role="alert" className={styles.error}>
          {resource.error}
        </p>
      )}

      {resource.status === 'ready' && (
        <>
          <ul className={styles.stats} aria-label="Statistiques">
            <Stat label="Projets publiés" value={resource.data.projects.published} detail={`${resource.data.projects.draft} brouillon(s)`} />
            <Stat label="Articles publiés" value={resource.data.articles.published} detail={`${resource.data.articles.draft} brouillon(s)`} />
            <Stat label="Messages reçus" value={resource.data.messages.total} detail={`${resource.data.messages.unread} non lu(s)`} />
            <Stat label="Fichiers en médiathèque" value={resource.data.media.total} />
            <Stat
              label="CV en ligne"
              text={resource.data.cv.publishedAt ? `Publié le ${formatDateTime(resource.data.cv.publishedAt)}` : 'Aucun CV publié'}
            />
            <Stat label="Connexions échouées (24 h)" value={resource.data.security.failedLogins24h} />
          </ul>

          <section aria-labelledby="activite" className={styles.section}>
            <h2 id="activite">Activité récente</h2>
            {resource.data.recentActivity.length === 0 ? (
              <p className={styles.muted}>Aucune activité pour le moment.</p>
            ) : (
              <ul className={styles.activity}>
                {resource.data.recentActivity.map((item, index) => (
                  <li key={`${item.createdAt}-${index}`}>
                    <Badge>{ACTION_LABELS[item.action] ?? item.action}</Badge>
                    <span className={styles.muted}>
                      {formatDateTime(item.createdAt)}
                      {item.actor ? ` · ${item.actor}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, detail, text }: { label: string; value?: number; detail?: string; text?: string }) {
  return (
    <li>
      <Card>
        <p className={styles.statLabel}>{label}</p>
        <p className={styles.statValue}>{text ?? value}</p>
        {detail && <p className={styles.muted}>{detail}</p>}
      </Card>
    </li>
  );
}
