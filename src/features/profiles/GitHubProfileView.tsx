import { useMemo } from 'react';
import { Github, MapPin, CalendarDays, ExternalLink, RefreshCw, Sparkles, Star, Flame, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GitHubContributionAnalytics } from '@/components/analytics/GitHubContributionAnalytics';
import { formatNumber, snapshotDelta } from '@/lib/analytics/dashboard-data';
import type { ProfileSnapshot, TrackedProfile } from '@/lib/integrations/registry';

export function GitHubProfileView({ profile, snapshots, liveMeta, refreshing, onRefresh }: { profile: TrackedProfile; snapshots: ProfileSnapshot[]; liveMeta: Record<string, unknown> | null; refreshing: boolean; onRefresh: () => void }) {
  const repos = profile.data?.repositories ?? [];
  const activity = profile.data?.activity ?? [];
  const github = profile.data?.githubContributions;
  const followers = Number(liveMeta?.followers ?? 0);
  const following = Number(liveMeta?.following ?? 0);
  const stars = repos.reduce((sum, repo) => sum + Number(repo.stargazers_count ?? repo.stars ?? 0), 0);
  const delta = snapshotDelta(snapshots, profile.id, 'followers');
  const languages = useMemo(() => { const m = new Map<string, number>(); repos.forEach((r) => r.language && m.set(r.language, (m.get(r.language) ?? 0) + 1)); const total = Array.from(m.values()).reduce((a,b)=>a+b,0)||1; return Array.from(m.entries()).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([name,n])=>({name,pct:Math.round(n/total*100)})); }, [repos]);
  const achievements = [
    ...(github && github.totalContributions >= 1000 ? ['🏆 1,000+ contributions'] : []),
    ...(github && github.activeDays >= 50 ? ['🔥 50+ active days'] : []),
    ...(repos.length >= 20 ? ['⚡ 20+ repositories'] : []),
    ...(stars >= 100 ? ['⭐ 100+ repository stars'] : []),
    ...(languages.length >= 5 ? ['📚 5 languages represented'] : []),
  ];
  const metricCards = [
    ['Repositories', repos.length, Github, ''],
    ['Total stars', stars, Star, ''],
    ['Followers', followers, Github, delta ? `${delta.delta >= 0 ? '+' : ''}${formatNumber(delta.delta)}` : ''],
    ['Contributions', github?.totalContributions ?? 0, Flame, github ? `${github.activeDays} active days` : ''],
  ] as const;

  return <div className="apivue-profile-page">
    <div className="apivue-profile-topbar"><div className="apivue-brand"><span className="apivue-brand-mark">A</span><span>APIVue · GitHub Profile</span></div><Badge variant="outline" className="apivue-live-badge"><span/> LIVE DATA</Badge></div>
    <section className="apivue-profile-card"><div className="apivue-profile-glow"/><div className="apivue-profile-top">
      <div className="apivue-avatar-wrap"><div className="apivue-avatar-ring"/><div className="apivue-avatar">{profile.avatarUrl ? <img src={profile.avatarUrl} alt=""/> : <Github/>}</div></div>
      <div className="apivue-profile-info"><div className="apivue-name-row"><h1>{profile.displayName || String(liveMeta?.name ?? profile.handle)}</h1><span className="apivue-peer-chip"><Sparkles/> Verified profile</span></div><div className="apivue-handle">@{profile.handle}</div><p className="apivue-bio">{String(liveMeta?.bio ?? profile.data?.bio ?? 'GitHub developer profile analyzed by APIVue using returned source data.')}</p><div className="apivue-profile-meta"><span className="apivue-platform-chip"><Github/> GitHub</span>{String(liveMeta?.location ?? profile.data?.location ?? '') && <span><MapPin/>{String(liveMeta?.location ?? profile.data?.location)}</span>}{String(liveMeta?.created_at ?? '') && <span><CalendarDays/> Joined {new Date(String(liveMeta?.created_at)).toLocaleDateString()}</span>}<span>Following {following}</span></div></div>
      <div className="apivue-profile-actions"><a href={profile.profileUrl} target="_blank" rel="noreferrer noopener"><Button variant="outline"> <ExternalLink/> View on GitHub</Button></a><Button onClick={onRefresh} disabled={refreshing}><RefreshCw className={refreshing ? 'animate-spin' : ''}/> Refresh</Button></div>
    </div></section>
    <div className="apivue-stats-grid">{metricCards.map(([label,value,Icon,change]) => <div className="apivue-stat-tile" key={label}><div className="apivue-stat-head"><span>{label}</span><Icon/></div><div className="apivue-stat-line"><span className="apivue-stat-value">{formatNumber(Number(value))}</span>{change && <span className="apivue-stat-delta">{change}</span>}</div><svg className="apivue-stat-spark" viewBox="0 0 100 24" preserveAspectRatio="none"><path d="M0,21 L15,14 L30,17 L45,10 L60,12 L75,7 L90,9 L100,3" fill="none" stroke="#3fb950" strokeWidth="1.5" strokeLinecap="round"/></svg></div>)}</div>
    {github ? <GitHubContributionAnalytics username={profile.handle} data={github}/> : <div className="apivue-card"><p className="apivue-muted-copy">GitHub contribution analytics are not stored yet. Refresh the profile to collect the real calendar.</p></div>}
    <section className="apivue-insight-card"><div className="apivue-insight-head"><Sparkles/> APIVue Insight</div><p className="apivue-insight-text">This profile currently has <strong>{formatNumber(repos.length)} repositories</strong>, <strong>{formatNumber(stars)} repository stars</strong> and <strong>{formatNumber(github?.totalContributions ?? 0)} contributions</strong> in the collected GitHub calendar. These values are calculated from returned source data.</p><div className="apivue-insight-stats"><div><span>Avg / active day</span><strong>{github?.activeDays ? (github.totalContributions/github.activeDays).toFixed(1) : '—'}</strong></div><div><span>Active days</span><strong>{github?.activeDays ?? '—'}</strong></div><div><span>Followers</span><strong>{formatNumber(followers)}</strong></div></div></section>
    <div className="apivue-two-col"><div className="apivue-card"><div className="apivue-card-title"><Github/> Recent activity</div><div className="apivue-timeline">{activity.slice(0,6).map((item)=><div className="apivue-tl-item" key={item.id}><div className="apivue-tl-dot"/><div><div className="apivue-tl-title">{item.title}</div><div className="apivue-tl-meta">{item.type} · {new Date(item.timestamp).toLocaleString()}</div></div></div>)}{!activity.length && <p className="apivue-muted-copy">No dated activity was returned by GitHub.</p>}</div></div>
    <div className="apivue-card"><div className="apivue-card-title"><Sparkles/> Contribution breakdown</div>{github && <div className="apivue-contrib-bar">{[['#3fb950',github.totalCommits],['#8250df',github.totalPullRequests],['#bc4c00',github.totalIssues],['#bf3989',github.totalReviews]].map(([color,value])=><div key={String(color)} style={{background:String(color),width:`${github.totalContributions ? Number(value)/github.totalContributions*100 : 0}%`}}/>)}</div>}{github ? [['Commits',github.totalCommits],['Pull requests',github.totalPullRequests],['Issues',github.totalIssues],['Reviews',github.totalReviews]].map(([label,value])=><div className="apivue-contrib-row" key={String(label)}><span>{label}</span><code>{formatNumber(Number(value))}</code></div>) : <p className="apivue-muted-copy">Unavailable until contribution data is collected.</p>}</div></div>
    <div className="apivue-two-col"><div className="apivue-card"><div className="apivue-card-title"><Github/> Language DNA</div><div className="apivue-lang-dna">{languages.length ? languages.map((l)=><div className="apivue-dna-row" key={l.name}><span>{l.name}</span><div><i style={{width:`${l.pct}%`}}/></div><code>{l.pct}%</code></div>) : <p className="apivue-muted-copy">No repository language data returned.</p>}</div></div><div className="apivue-card"><div className="apivue-card-title"><Sparkles/> Developer signals</div><div className="apivue-signal-grid">{[['Repositories',repos.length],['Stars',stars],['Followers',followers],['Activity',activity.length]].map(([label,value])=><div key={String(label)}><span>{label}</span><strong>{formatNumber(Number(value))}</strong></div>)}</div></div></div>
    <div className="apivue-card"><div className="apivue-card-title"><Trophy/> Achievements</div><div className="apivue-badges">{achievements.length ? achievements.map((a)=><span className="apivue-badge" key={a}>{a}</span>) : <p className="apivue-muted-copy">Achievements appear automatically from real collected metrics.</p>}</div></div>
  </div>;
}
