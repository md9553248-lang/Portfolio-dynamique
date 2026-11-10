export interface DashboardStats {
  projects: { published: number; draft: number };
  articles: { published: number; draft: number };
  messages: { total: number; unread: number };
  media: { total: number };
  cv: { publishedAt: string | null };
  security: { failedLogins24h: number };
}

export interface ActivityItem {
  action: string;
  entityType: string | null;
  createdAt: string;
  actor: string | null;
}

export interface DashboardRepository {
  getStats(): Promise<DashboardStats>;
  getRecentActivity(): Promise<ActivityItem[]>;
}
