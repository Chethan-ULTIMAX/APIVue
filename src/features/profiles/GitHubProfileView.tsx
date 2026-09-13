import { useMemo } from 'react';
import { CalendarDays, ExternalLink, Flame, Github, MapPin, Moon, RefreshCw, Sparkles, Star, Sun, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GitHubContributionAnalytics } from '@/components/analytics/GitHubContributionAnalytics';
import { formatNumber, snapshotDelta } from '@/lib/analytics/dashboard-data';
import { useTheme } from '@/lib/theme-context';
import type { ProfileSnapshot, TrackedProfile } from '@/lib/integrations/registry';
import './github-profile.css';
import './github-profile-analytics.css';

function sparkPath(values: number[]) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = Math.max(max - min, 1);
  return values.map((value, index) => {
    const x = (index / (values.length - 1)) * 100;
    const y = 21 - ((value - min) / span) * 18;
    return `${index ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
}

function radarPoints(values: number[], radius = 38, center = 50) {
  return values.map((value, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / values.length;
    const r = radius * Math.max(0, Math.min(value, 100)) / 100;
    return `${(center + Math.cos(angle) * r).toFixed(2)},${(center + Math.sin(angle) * r).toFixed(2)}`;
  }).join(' ');
}

export function GitHubProfileView({ profile, snapshots, liveMeta, refreshing, onRefresh }: { profile: TrackedProfile; snapshots: ProfileSnapshot[]; liveMeta: Record<string, unknown> | null; refreshing: boolean; onRefresh: () => void }) {
  const { theme, setTheme } = useTheme();
  const repos = profile.data?.repositories ?? profile.data?.publicRepositories ?? [];
  const activity = profile.data?.activity ?? [];
  const github = profile.data?.githubContributions;
  const followers = Number(liveMeta?.followers ?? 0);
  const following = Number(liveMeta?.following ?? 0);
  const stars = repos.reduce((sum, repo) => sum + Number(repo.stargazers_count ?? repo.stars ?? 0), 0);
  const delta = snapshotDelta(snapshots, profile.id, 'followers');

  const historicalFollowers = useMemo(() => snapshots
    .slice()
    .sort((a, b) => a.captured_at.localeCompare(b.captured_at))
    .map((snapshot) => Number(snapshot.metrics.followers ?? 0))
    .filter((value, index, values) => index === 0 || value !== values[index - 1])
    .slice(-8), [snapshots]);
  const historicalRepos = useMemo(() => snapshots
    .slice()
    .sort((a, b) => a.captured_at.localeCompare(b.captured_at))
    .map((snapshot) => Number(snapshot.metrics.repositories ?? snapshot.metrics.repos ?? 0))
    .filter((value, index, values) => index === 0 || value !== values[index - 1])
    .slice(-8), [snapshots]);
  const historicalStars = useMemo(() => snapshots
    .slice()
    .sort((a, b) => a.captured_at.localeCompare(b.captured_at))
    .map((snapshot) => Number(snapshot.metrics.stars ?? 0))
    .filter((value, index, values) => index === 0 || value !== values[index - 1])
    .slice(-8), [snapshots]);

  const languages = useMemo(() => {
    const counts = new Map<string, number>();
    repos.forEach((repo) => { if (repo.language) counts.set(repo.language, (counts.get(repo.language) ?? 0) + 1); });
    const total = Array.from(counts.values()).reduce((sum, value) => sum + value, 0) || 1;
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, pct: Math.round((count / total) * 100) }));
  }, [repos]);

  const activeDays = github?.activeDays ?? 0;
  const totalContributions = github?.totalContributions ?? 0;
  const consistency = github?.days?.length ? Math.round((activeDays / github.days.length) * 100) : 0;
  const developerSignals = [
    Math.min(100, repos.length * 5),
    Math.min(100, totalContributions / 10),
    Math.min(100, stars / 2),
    Math.min(100, activity.length * 5),
    consistency,
  ].map((value) => Math.round(value));

  const achievements = [
    ...(totalContributions >= 1000 ? ['🏆 1,000+ contributions'] : []),
    ...(github && activeDays >= 50 ? ['🔥 50+ active days'] : []),
    ...(repos.length >= 20 ? ['⚡ 20+ repositories'] : []),
    ...(stars >= 100 ? ['⭐ 100+ repository stars'] : []),
    ...(languages.length >= 5 ? ['📚 5 languages represented'] : []),
  ];

  const metricCards = [
    ['Repositories', repos.length, Github, historicalRepos],
    ['Total stars', stars, Star, historicalStars],
    ['Followers', followers, Github, historicalFollowers],
    ['Contributions', totalContributions, Flame, github?.days?.slice(-8).map((day) => day.count) ?? []],
  ] as const;

  return <div className="apivue-profile-page">
    <div className="apivue-profile-topbar">
      <div className="apivue-brand"><span className="apivue-brand-mark">A</span><span>APIVue · GitHub Profile</span></div>
      <div className="apivue-topbar-actions"><Badge variant="outline" className="apivue-live-badge"><span /> LIVE DATA</Badge><button type="button" className="apivue-theme-toggle" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Toggle theme">{theme === 'dark' ? <Sun /> : <Moon />}<span>{theme === 'dark' ? 'Light' : 'Dark'}</span></button></div>
    </div>

    <section className="apivue-profile-card">
      <div className="apivue-profile-glow" />
      <div className="apivue-profile-top">
        <div className="apivue-avatar-wrap"><div className="apivue-avatar-ring" /><div className="apivue-avatar">{profile.avatarUrl ? <img src={profile.avatarUrl} alt={`${profile.handle} avatar`} /> : <Github />}</div></div>
        <div className="apivue-profile-info"><div className="apivue-name-row"><h1>{profile.displayName || String(liveMeta?.name ?? profile.handle)}</h1><span className="apivue-peer-chip"><Sparkles /> Profile analytics</span></div><div className="apivue-handle">@{profile.handle}</div><p className="apivue-bio">{String(liveMeta?.bio ?? profile.data?.bio ?? 'GitHub developer profile analyzed by APIVue using returned source data.')}</p><div className="apivue-profile-meta"><span className="apivue-platform-chip"><Github /> GitHub</span>{String(liveMeta?.location ?? profile.data?.location ?? '') && <span><MapPin />{String(liveMeta?.location ?? profile.data?.location)}</span>}{String(liveMeta?.created_at ?? profile.data?.joinedAt ?? '') && <span><CalendarDays /> Joined {new Date(String(liveMeta?.created_at ?? profile.data?.joinedAt)).toLocaleDateString()}</span>}<span>Following {following}</span></div></div>
        <div className="apivue-profile-actions"><a href={profile.profileUrl ?? profile.profile_url} target="_blank" rel="noreferrer noopener"><Button variant="outline"><ExternalLink /> View on GitHub</Button></a><Button onClick={onRefresh} disabled={refreshing}><RefreshCw className={refreshing ? 'animate-spin' : ''} /> Refresh</Button></div>
      </div>
    </section>

    <div className="apivue-stats-grid">{metricCards.map(([label, value, Icon, history]) => { const path = sparkPath(history); return <div className="apivue-stat-tile" key={label}><div className="apivue-stat-head"><span>{label}</span><Icon /></div><div><span className="apivue-stat-value">{formatNumber(Number(value))}</span>{label === 'Followers' && delta && <span className="apivue-stat-delta">{delta.delta >= 0 ? '+' : ''}{formatNumber(delta.delta)}</span>}</div>{path && <svg className="apivue-stat-spark" viewBox="0 0 100 24" preserveAspectRatio="none" aria-hidden="true"><path d={path} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>}</div>; })}</div>

    {github ? <GitHubContributionAnalytics username={profile.handle} data={github} /> : <div className="apivue-card"><p className="apivue-muted-copy">GitHub contribution analytics are not stored yet. Refresh the profile to collect the real calendar.</p></div>}

    <section className="apivue-insight-card"><div className="apivue-insight-head"><Sparkles /> APIVue Insight</div><p className="apivue-insight-text">This profile currently has <strong>{formatNumber(repos.length)} repositories</strong>, <strong>{formatNumber(stars)} repository stars</strong> and <strong>{formatNumber(totalContributions)} contributions</strong> in the collected GitHub calendar. These values are calculated from returned source data.</p><div className="apivue-insight-stats"><div><span>Avg / active day</span><strong>{activeDays ? (totalContributions / activeDays).toFixed(1) : '—'}</strong></div><div><span>Active days</span><strong>{activeDays || '—'}</strong></div><div><span>Followers</span><strong>{formatNumber(followers)}</strong></div></div></section>

    <div className="apivue-two-col"><div className="apivue-card"><div className="apivue-card-title"><Github /> Recent activity</div><div className="apivue-timeline">{activity.slice(0, 6).map((item, index) => <div className="apivue-tl-item" key={`${item.date}-${index}`}><div className="apivue-tl-dot" /><div><div className="apivue-tl-title">{item.label || item.type || 'GitHub activity'}</div><div className="apivue-tl-meta">{item.type || 'Contribution'} · {new Date(`${item.date}T00:00:00Z`).toLocaleDateString()}</div><div className="apivue-tl-count">{formatNumber(item.count)} contributions</div></div></div>)}{!activity.length && <p className="apivue-muted-copy">No dated activity was returned by GitHub.</p>}</div></div>
      <div className="apivue-card"><div className="apivue-card-title"><Sparkles /> Contribution breakdown</div>{github && <div className="apivue-contrib-bar">{[['#3fb950', github.totalCommits], ['#8250df', github.totalPullRequests], ['#bc4c00', github.totalIssues], ['#bf3989', github.totalReviews]].map(([color, value]) => <div key={String(color)} style={{ background: String(color), width: `${totalContributions ? Number(value) / totalContributions * 100 : 0}%` }} />)}</div>}{github ? [['Commits', github.totalCommits], ['Pull requests', github.totalPullRequests], ['Issues', github.totalIssues], ['Reviews', github.totalReviews]].map(([label, value]) => <div className="apivue-contrib-row" key={String(label)}><span>{label}</span><code>{formatNumber(Number(value))}</code></div>) : <p className="apivue-muted-copy">Unavailable until contribution data is collected.</p>}</div></div>

    <div className="apivue-two-col"><div className="apivue-card"><div className="apivue-card-title"><Github /> Language DNA</div><div className="apivue-lang-dna">{languages.length ? languages.map((language) => <div className="apivue-dna-row" key={language.name}><span>{language.name}</span><div><i style={{ width: `${language.pct}%` }} /></div><code>{language.pct}%</code></div>) : <p className="apivue-muted-copy">No repository language data returned.</p>}</div></div>
      <div className="apivue-card"><div className="apivue-card-title"><Sparkles /> Developer signals</div><div className="apivue-radar-wrap"><svg className="apivue-radar" viewBox="0 0 100 100" role="img" aria-label="Developer signals radar chart"><g className="apivue-radar-grid">{[25, 50, 75, 100].map((level) => <polygon key={level} points={radarPoints([level, level, level, level, level])} />)}<line x1="50" y1="12" x2="50" y2="88" /><line x1="13.8" y1="38.2" x2="86.2" y2="61.8" /><line x1="13.8" y1="61.8" x2="86.2" y2="38.2" /></g><polygon className="apivue-radar-area" points={radarPoints(developerSignals)} /><polygon className="apivue-radar-line" points={radarPoints(developerSignals)} />{developerSignals.map((value, index) => { const angle = -Math.PI / 2 + (index * Math.PI * 2) / 5; return <circle key={index} cx={50 + Math.cos(angle) * 38 * value / 100} cy={50 + Math.sin(angle) * 38 * value / 100} r="1.4" className="apivue-radar-dot" />; })}</svg><div className="apivue-radar-labels"><span>Repositories</span><span>Contributions</span><span>Community</span><span>Activity</span><span>Consistency</span></div></div></div></div>

    <div className="apivue-card"><div className="apivue-card-title"><Trophy /> Achievements</div><div className="apivue-badges">{achievements.length ? achievements.map((achievement) => <span className="apivue-badge" key={achievement}>{achievement}</span>) : <p className="apivue-muted-copy">Achievements appear automatically from real collected metrics.</p>}</div></div>
  </div>;
}
