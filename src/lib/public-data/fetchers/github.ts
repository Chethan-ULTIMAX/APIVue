/** GitHub public profile fetcher. */

const GITHUB_API = 'https://api.github.com';
const PUBLIC_PROFILE_PROXY = 'https://ehabrjqrfhgwdlmbcwho.supabase.co/functions/v1/public-profile';

export interface RawGitHubUser {
  login: string; id: number; name: string | null; avatar_url: string; html_url: string; bio: string | null;
  company: string | null; blog: string | null; location: string | null; twitter_username: string | null;
  created_at: string; updated_at: string; public_repos: number; public_gists: number; followers: number; following: number;
}
export interface RawGitHubRepo {
  id: number; name: string; full_name: string; html_url: string; description: string | null; language: string | null;
  stargazers_count: number; forks_count: number; open_issues_count: number; size: number; fork: boolean; archived: boolean;
  disabled?: boolean; topics?: string[]; default_branch: string; created_at: string; updated_at: string; pushed_at: string;
}
export interface RawGitHubEvent {
  id: string; type: string; created_at: string | null; repo?: { name: string };
  payload?: { ref?: string; size?: number; action?: string; commits?: Array<{ message?: string }> };
}
export interface RawGitHubContribution {
  date: string; count: number; level: 0 | 1 | 2 | 3 | 4;
}
export interface RawGitHubProfile {
  user: RawGitHubUser;
  repos: RawGitHubRepo[];
  events: RawGitHubEvent[];
  contributions: { days: RawGitHubContribution[]; totalContributions: number };
}

interface GitHubErrorResponse { message?: string; }
async function githubRequest<T>(path: string): Promise<T> {
  const response = await fetch(`${GITHUB_API}${path}`, { headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' } });
  if (!response.ok) {
    if (response.status === 404) throw new Error('GitHub user not found.');
    if (response.status === 403 || response.status === 429) throw new Error('GitHub public API rate limit reached. Please try again later.');
    let detail = ''; try { const body = (await response.json()) as GitHubErrorResponse; if (body?.message) detail = ` (${body.message})`; } catch { /* non-JSON */ }
    throw new Error(`GitHub request failed with status ${response.status}${detail}.`);
  }
  return (await response.json()) as T;
}

async function fetchContributionCalendar(username: string) {
  const response = await fetch(PUBLIC_PROFILE_PROXY, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider: 'github', handle: username }) });
  const payload = await response.json() as { error?: string; data?: { days: RawGitHubContribution[]; totalContributions: number } };
  if (!response.ok || !payload.data) throw new Error(payload.error ?? 'GitHub contribution calendar could not be loaded.');
  return payload.data;
}

export async function fetchGitHubPublicProfile(username: string): Promise<RawGitHubProfile> {
  const cleanUsername = username.trim();
  if (!cleanUsername) throw new Error('Enter a GitHub username.');
  const encoded = encodeURIComponent(cleanUsername);
  const [user, repos, events, contributions] = await Promise.all([
    githubRequest<RawGitHubUser>(`/users/${encoded}`),
    githubRequest<RawGitHubRepo[]>(`/users/${encoded}/repos?per_page=100&sort=pushed&direction=desc`),
    githubRequest<RawGitHubEvent[]>(`/users/${encoded}/events/public?per_page=30`),
    fetchContributionCalendar(cleanUsername),
  ]);
  return { user, repos, events, contributions };
}
