import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Activity, ArrowLeft, ExternalLink, GitBranch, Globe2, Lock, MapPin, RefreshCw, ShieldCheck, Star, GitPullRequest } from 'lucide-react';
import { useProfileSnapshots, useSyncProfile, useTrackedProfiles } from '@/hooks/use-profiles';
import { getIntegration } from '@/lib/integrations/registry';
import { formatNumber, numericMetrics, platformLabel, platformTone, snapshotDelta } from '@/lib/analytics/dashboard-data';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { GitHubContributionAnalytics } from '@/components/analytics/GitHubContributionAnalytics';
import { TimeRangeChart } from '@/components/analytics/TimeRangeChart';

export function ProfileDetailView() {
  const { id } = useParams<{ id: string }>();
  const { data: profiles = [], isLoading, refetch } = useTrackedProfiles();
  const { data: snapshots = [] } = useProfileSnapshots(id);
  const sync = useSyncProfile();
  const [refreshing, setRefreshing] = useState(false);
  const [liveMeta, setLiveMeta] = useState<Record<string, unknown> | null>(null);
  const profile = profiles.find((item) => item.id === id);
  const integration = profile ? getIntegration(profile.platform) : null;
  const tone = platformTone(profile?.platform ?? 'github');

  useEffect(() => {
    if (!profile || profile.platform !== 'github') return;
    let cancelled = false;
    fetch(`https://api.github.com/users/${encodeURIComponent(profile.handle)}`, { headers: { Accept: 'application/vnd.github+json' } })
      .then(async (response) => response.ok ? response.json() as Promise<Record<string, unknown>> : null)
      .then((user) => { if (!cancelled && user) setLiveMeta(user); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [profile?.handle, profile?.platform]);

  const metrics = useMemo(() => {
    if (!profile) return [];
    const stored = numericMetrics(profile);
    if (profile.platform !== 'github' || !liveMeta) return stored;
    const replacements: Record<string, number> = { followers: Number(liveMeta.followers ?? 0), following: Number(liveMeta.following ?? 0), public_gists: Number(liveMeta.public_gists ?? 0) };
    return stored.map((item) => replacements[item.key] !== undefined ? { ...item, value: replacements[item.key] } : item);
  }, [liveMeta, profile]);
  const activity = profile?.data?.activity ?? [];
  const repos = profile?.data?.repositories ?? [];
  const history = useMemo(() => {
    if (!profile) return [];
    const keys = Array.from(new Set(snapshots.flatMap((snapshot) => Object.keys(snapshot.metrics ?? {}))));
    return keys.map((key) => ({ key, label: metrics.find((metric) => metric.key === key)?.label ?? key.replace(/_/g, ' '), points: snapshots.map((snapshot) => ({ date: snapshot.captured_at.slice(0, 10), count: Number(snapshot.metrics[key] ?? 0) })) }));
  }, [metrics, profile, snapshots]);

  if (isLoading) return <div className="p-6"><div className="mx-auto max-w-7xl animate-pulse space-y-5"><div className="h-32 rounded-3xl bg-muted"/><div className="h-72 rounded-3xl bg-muted"/></div></div>;
  if (!profile || !integration) return <div className="p-6"><Card><CardContent className="p-10 text-center"><p className="font-semibold">Profile not found</p><Link to="/dashboard/profiles"><Button className="mt-4" variant="outline"><ArrowLeft className="mr-2 h-4 w-4"/>Back to profiles</Button></Link></CardContent></Card></div>;

  const refresh = async () => { setRefreshing(true); try { await sync.mutateAsync({ platform: profile.platform, handle: profile.handle }); await refetch(); toast({ title: 'Profile refreshed', description: 'Latest source data requested.' }); } catch (error) { toast({ title: 'Refresh failed', description: error instanceof Error ? error.message : 'Could not refresh profile.', variant: 'destructive' }); } finally { setRefreshing(false); } };

  return <div className="relative min-h-full overflow-hidden"><div className="pointer-events-none absolute -top-32 right-0 h-96 w-96 rounded-full bg-primary/[0.08] blur-3xl"/><div className="relative mx-auto max-w-7xl space-y-6 p-5 sm:p-6 lg:p-8">
    <Link to="/dashboard/profiles" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5"/>Profiles</Link>
    <Card className="overflow-hidden border-border/70 bg-card/90"><CardContent className="p-6 sm:p-8"><div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between"><div className="flex min-w-0 items-center gap-4"><div className={`flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl ring-1 ${tone.ring} ${tone.bg}`}>{profile.avatarUrl ? <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover"/> : <Activity className={`h-8 w-8 ${tone.text}`}/>}</div><div className="min-w-0"><div className="flex flex-wrap gap-2"><Badge variant="outline" className={`${tone.bg} ${tone.text}`}>{platformLabel(profile.platform)}</Badge>{profile.data?.privateAccess && <Badge variant="outline" className="gap-1"><ShieldCheck className="h-3 w-3"/>Verified access</Badge>}</div><h1 className="mt-2 truncate text-2xl font-bold sm:text-3xl">{profile.displayName || profile.handle}</h1><p className="font-mono text-sm text-muted-foreground">@{profile.handle}</p><div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">{String(liveMeta?.location ?? profile.data?.location ?? '') && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3"/>{String(liveMeta?.location ?? profile.data?.location)}</span>}{String(liveMeta?.created_at ?? profile.data?.joinedAt ?? '') && <span>Joined {new Date(String(liveMeta?.created_at ?? profile.data?.joinedAt)).toLocaleDateString()}</span>}<span>Synced {profile.lastSyncedAt ? new Date(profile.lastSyncedAt).toLocaleString() : '—'}</span></div>{String(liveMeta?.bio ?? profile.data?.bio ?? '') && <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{String(liveMeta?.bio ?? profile.data?.bio)}</p>}</div></div><div className="flex flex-wrap gap-2">{profile.profileUrl && <a href={profile.profileUrl} target="_blank" rel="noreferrer noopener"><Button variant="outline" className="gap-2"><ExternalLink className="h-4 w-4"/>View on {integration.name}</Button></a>}<Button onClick={() => void refresh()} disabled={refreshing} className="gap-2"><RefreshCw className={refreshing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'}/>Refresh</Button></div></div></CardContent></Card>
    <section><div className="mb-3 flex items-end justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">01 · Snapshot</p><h2 className="mt-1 text-2xl font-bold">{integration.name} at a glance</h2></div><Badge variant="outline">{metrics.length} real signals</Badge></div>{metrics.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{metrics.slice(0, 12).map((metric) => { const delta = snapshotDelta(snapshots, profile.id, metric.key); return <Card key={metric.key} className="group overflow-hidden transition hover:-translate-y-1 hover:shadow-lg"><CardContent className="p-5"><div className="mb-4 h-1 w-12 rounded-full" style={{ background: tone.chart }}/><p className="text-xs text-muted-foreground">{metric.label}</p><p className="mt-2 text-3xl font-black tracking-tight">{formatNumber(metric.value)}</p>{delta && <p className={`mt-1 text-[10px] font-semibold ${delta.delta >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{delta.delta >= 0 ? '+' : ''}{formatNumber(delta.delta)} since first snapshot</p>}</CardContent></Card>; })}</div> : <Card className="border-dashed"><CardContent className="p-8 text-center text-sm text-muted-foreground">No platform metrics were returned yet. Refresh the profile to request a fresh sync.</CardContent></Card>}</section>
    {profile.platform === 'github' && profile.data?.githubContributions ? <section className="space-y-5"><GitHubContributionAnalytics username={profile.handle} data={profile.data.githubContributions}/><TimeRangeChart points={activity} tone={tone.chart} title="GitHub activity timeline" subtitle="Recent events returned by GitHub, with a readable 7-day / 30-day / 1-year / all-time view."/></section> : profile.platform !== 'github' ? <TimeRangeChart points={activity} tone={tone.chart} title={`${integration.name} activity`} subtitle="Real dated activity returned by the connected source."/> : <Card className="border-dashed"><CardContent className="p-8 text-center text-sm text-muted-foreground">GitHub contribution analytics are not stored yet. Refresh this profile to collect the real calendar.</CardContent></Card>}
    {(profile.data?.breakdowns ?? []).length > 0 && <section><div className="mb-3"><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">03 · Signals</p><h2 className="text-2xl font-bold">What the data says</h2></div><div className="grid gap-4 lg:grid-cols-2">{(profile.data?.breakdowns ?? []).map((breakdown) => { const max = Math.max(...breakdown.items.map((item) => item.value), 1); return <Card key={breakdown.key}><CardContent className="p-5 sm:p-6"><h3 className="font-semibold">{breakdown.label}</h3><div className="mt-5 space-y-3">{breakdown.items.slice(0, 10).map((item) => <div key={item.label}><div className="flex items-center justify-between gap-3 text-xs"><span className="truncate font-medium">{item.label}</span><span className="font-bold text-muted-foreground">{formatNumber(item.value)}</span></div><div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.max(4, item.value / max * 100)}%`, background: tone.chart }}/></div></div>)}</div></CardContent></Card>; })}</div></section>}
    {history.length > 0 && <section><div className="mb-3"><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">04 · Progress</p><h2 className="text-2xl font-bold">Tracked history</h2></div><div className="grid gap-4 lg:grid-cols-2">{history.slice(0, 6).map((item) => <TimeRangeChart key={item.key} points={item.points} tone={tone.chart} title={item.label} subtitle="Real APIVue snapshots — never synthetic points." compact/>)}</div></section>}
    {profile.platform === 'github' && repos.length > 0 && <section><div className="mb-3"><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">05 · Projects</p><h2 className="text-2xl font-bold">Repositories</h2></div><div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">{repos.slice(0, 12).map((repo) => <a key={repo.id ?? repo.name} href={repo.html_url ?? repo.url} target="_blank" rel="noreferrer noopener"><Card className="h-full transition hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg"><CardContent className="p-4"><div className="flex items-center justify-between gap-2"><div className="flex min-w-0 items-center gap-2"><GitBranch className="h-4 w-4 shrink-0 text-muted-foreground"/><p className="truncate text-sm font-semibold">{repo.name}</p></div>{repo.private ? <Lock className="h-3.5 w-3.5 text-amber-500"/> : <Globe2 className="h-3.5 w-3.5 text-emerald-500"/>}</div><p className="mt-2 line-clamp-2 min-h-10 text-xs leading-5 text-muted-foreground">{repo.description || 'No repository description.'}</p><div className="mt-4 flex flex-wrap gap-3 text-[11px] text-muted-foreground"><span className="inline-flex items-center gap-1"><Star className="h-3 w-3"/>{formatNumber(Number(repo.stargazers_count ?? repo.stars ?? 0))}</span><span className="inline-flex items-center gap-1"><GitPullRequest className="h-3 w-3"/>{formatNumber(Number(repo.forks_count ?? repo.forks ?? 0))}</span><span>{repo.language || 'Mixed'}</span></div></CardContent></Card></a>)}</div></section>}
  </div></div>;
}
