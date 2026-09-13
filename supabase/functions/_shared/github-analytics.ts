export interface GithubAnalytics {
  metrics: Array<{ key: string; label: string; value: number }>;
  activity: Array<{ date: string; count: number; label?: string; type?: string }>;
  breakdowns: Array<{ key: string; label: string; items: Array<{ label: string; value: number }> }>;
  highlights: Array<{ title: string; url?: string; subtitle?: string }>;
  bio?: string;
  location?: string;
  joinedAt?: string;
}

type GithubRequest = (path: string) => Promise<unknown>;
type Repo = Record<string, unknown>;
type Event = Record<string, unknown>;

function asNumber(value: unknown) { return typeof value === 'number' && Number.isFinite(value) ? value : 0; }
function repoName(repo: Repo) { return typeof repo.name === 'string' ? repo.name : 'Repository'; }
function repoUrl(repo: Repo) { return typeof repo.html_url === 'string' ? repo.html_url : typeof repo.url === 'string' ? repo.url : undefined; }

export async function collectGithubAnalytics(request: GithubRequest, login: string, repositories: unknown[], userOverride?: Record<string, unknown>): Promise<GithubAnalytics> {
  const user = userOverride ?? await request(`/users/${encodeURIComponent(login)}`) as Record<string, unknown>;
  const repos = repositories.filter((item): item is Repo => !!item && typeof item === 'object');
  let events: Event[] = [];
  try {
    const result = await request(`/users/${encodeURIComponent(login)}/events?per_page=100`);
    events = Array.isArray(result) ? result.filter((item): item is Event => !!item && typeof item === 'object') : [];
  } catch { events = []; }

  const publicRepos = repos.filter((repo) => repo.private !== true);
  const privateRepos = repos.filter((repo) => repo.private === true);
  const stars = repos.reduce((sum, repo) => sum + asNumber(repo.stargazers_count ?? repo.stars), 0);
  const forks = repos.reduce((sum, repo) => sum + asNumber(repo.forks_count ?? repo.forks), 0);
  const openIssues = repos.reduce((sum, repo) => sum + asNumber(repo.open_issues_count), 0);
  const languages = new Map<string, number>();
  for (const repo of repos) { if (typeof repo.language === 'string' && repo.language) languages.set(repo.language, (languages.get(repo.language) ?? 0) + 1); }

  const eventTypes = new Map<string, number>();
  const byDay = new Map<string, number>();
  let commits = 0;
  for (const event of events) {
    const created = typeof event.created_at === 'string' ? event.created_at : '';
    const day = created.slice(0, 10);
    if (day) byDay.set(day, (byDay.get(day) ?? 0) + 1);
    const type = typeof event.type === 'string' ? event.type : 'Other';
    eventTypes.set(type, (eventTypes.get(type) ?? 0) + 1);
    if (type === 'PushEvent') {
      const payload = event.payload;
      if (payload && typeof payload === 'object' && Array.isArray((payload as Record<string, unknown>).commits)) commits += ((payload as Record<string, unknown>).commits as unknown[]).length;
    }
  }

  const topLanguages = Array.from(languages, ([label, value]) => ({ label, value })).sort((a,b)=>b.value-a.value).slice(0,8);
  const activityKinds = Array.from(eventTypes, ([label, value]) => ({ label: label.replace(/Event$/, '').replace(/([a-z])([A-Z])/g, '$1 $2'), value })).sort((a,b)=>b.value-a.value).slice(0,8);
  const visibility = [{ label: 'Public repositories', value: publicRepos.length }, { label: 'Private repositories', value: privateRepos.length }].filter((x)=>x.value>0);
  const recentRepos = [...repos].sort((a,b)=>String(b.pushed_at ?? b.updated_at ?? '').localeCompare(String(a.pushed_at ?? a.updated_at ?? ''))).slice(0,6);

  return {
    metrics: [
      { key: 'repository_total', label: 'Repositories', value: repos.length },
      { key: 'public_repository_total', label: 'Public repositories', value: publicRepos.length },
      { key: 'private_repository_total', label: 'Private repositories', value: privateRepos.length },
      { key: 'stars_total', label: 'Stars', value: stars },
      { key: 'forks_total', label: 'Forks', value: forks },
      { key: 'open_issues_total', label: 'Open issues & PRs', value: openIssues },
      { key: 'followers', label: 'Followers', value: asNumber(user.followers) },
      { key: 'following', label: 'Following', value: asNumber(user.following) },
      { key: 'public_gists', label: 'Public gists', value: asNumber(user.public_gists) },
      { key: 'recent_events', label: 'Recent events', value: events.length },
      { key: 'recent_commits', label: 'Recent commits', value: commits },
      { key: 'active_days', label: 'Active days in recent events', value: byDay.size },
    ],
    activity: Array.from(byDay, ([date, count]) => ({ date, count })).sort((a,b)=>a.date.localeCompare(b.date)),
    breakdowns: [
      { key: 'languages', label: 'Languages across accessible repositories', items: topLanguages },
      { key: 'event_types', label: 'Recent GitHub activity types', items: activityKinds },
      { key: 'visibility', label: 'Repository visibility', items: visibility },
    ].filter((b)=>b.items.length>0),
    highlights: recentRepos.map((repo) => ({ title: repoName(repo), url: repoUrl(repo), subtitle: `${typeof repo.language === 'string' && repo.language ? repo.language : 'Repository'} · ${asNumber(repo.stargazers_count ?? repo.stars)} stars · ${asNumber(repo.forks_count ?? repo.forks)} forks` })),
    bio: typeof user.bio === 'string' ? user.bio : undefined,
    location: typeof user.location === 'string' ? user.location : undefined,
    joinedAt: typeof user.created_at === 'string' ? user.created_at : undefined,
  };
}
