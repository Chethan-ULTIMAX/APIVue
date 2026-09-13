import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowRight, BarChart3, Database, GitCompareArrows, Globe2, Loader2, Search, Sparkles, Trophy, Users, Zap } from 'lucide-react';
import { explorePublicProfile, getPublicPlatform, type PublicDataResult, type PublicPlatform } from '@/lib/public-data';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { PlatformSelector } from './components/PlatformSelector';
import { ProfileSearch } from './components/ProfileSearch';
import { PublicProfileCard } from './components/PublicProfileCard';
import { formatNumber } from '@/lib/analytics/dashboard-data';

const PLATFORM_HINTS: Record<PublicPlatform, string> = {
  github: 'Repositories, languages, stars, followers and public activity',
  codeforces: 'Rating, rank, contests, tags and submissions',
  leetcode: 'Solved problems, difficulty, languages, contests and calendar',
  codewars: 'Honor, rank, kata progress and language scores',
  stackoverflow: 'Reputation, badges, answers, questions and top tags',
};

function numericMetrics(data: PublicDataResult) {
  return data.metrics.filter((metric) => typeof metric.value === 'number' && Number.isFinite(metric.value));
}

export function ExploreView() {
  const navigate = useNavigate();
  const [platform, setPlatform] = useState<PublicPlatform>('github');
  const [username, setUsername] = useState('');
  const [data, setData] = useState<PublicDataResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const definition = getPublicPlatform(platform);
  const metrics = useMemo(() => (data ? numericMetrics(data) : []), [data]);
  const activity = useMemo(() => {
    if (!data) return [];
    const byDay = new Map<string, number>();
    for (const item of data.activity) byDay.set(item.timestamp.slice(0, 10), (byDay.get(item.timestamp.slice(0, 10)) ?? 0) + 1);
    return Array.from(byDay, ([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date)).slice(-45);
  }, [data]);

  const handlePlatformChange = (next: PublicPlatform) => { setPlatform(next); setError(''); setData(null); };
  const handleExplore = async () => {
    if (!username.trim()) { setError(`Enter a ${definition.placeholder.toLowerCase()}.`); return; }
    setLoading(true); setError('');
    try { setData(await explorePublicProfile(platform, username)); }
    catch (err) { setData(null); setError(err instanceof Error ? err.message : 'Failed to fetch public profile.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="relative min-h-full overflow-hidden">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-20 h-72 w-72 rounded-full bg-blue-500/5 blur-3xl" />
      <div className="relative mx-auto max-w-7xl space-y-7 p-5 sm:p-6 lg:p-8">
        <section className="overflow-hidden rounded-3xl border border-border bg-card/60 p-6 shadow-sm backdrop-blur-xl sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl"><Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary"><Sparkles className="mr-1.5 h-3 w-3"/> Public data explorer</Badge><h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Explore a developer profile.</h1><p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">Fetch one public profile, inspect exactly what the source returns, then send that same result into individual analysis or comparison.</p></div>
            <div className="grid grid-cols-3 gap-2 sm:min-w-[330px]">{[['5','platforms'],['live','public API'],['0','connections']].map(([value,label]) => <div key={label} className="rounded-2xl border border-border bg-background/60 px-4 py-3 text-center"><p className="text-lg font-bold">{value}</p><p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p></div>)}</div>
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card/50 p-4 backdrop-blur-xl sm:p-6">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">01 · Source</p><h2 className="mt-1 text-lg font-semibold">Choose a platform and search.</h2></div><span className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex"><Globe2 className="h-4 w-4"/>Live public API lookup</span></div>
          <div className="grid gap-5"><PlatformSelector value={platform} onChange={handlePlatformChange}/><div className="grid gap-3 md:grid-cols-[1fr_auto]"><ProfileSearch value={username} onChange={setUsername} onSubmit={handleExplore} loading={loading} platform={platform}/><Button type="button" onClick={handleExplore} disabled={loading} className="h-12 rounded-xl px-6">{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Search className="mr-2 h-4 w-4"/>}{loading ? 'Fetching…' : 'Explore profile'}</Button></div><div className="flex flex-wrap gap-2 text-xs text-muted-foreground"><Badge variant="secondary">{definition.name}</Badge><span>{PLATFORM_HINTS[platform]}</span><span>· No account connection required</span></div>{error && <div role="alert" className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>}</div>
        </section>

        {data ? <div className="space-y-6">
          <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">02 · Individual profile</p><h2 className="mt-1 text-xl font-semibold">{data.profile.displayName || data.profile.username}</h2><p className="mt-1 text-xs text-muted-foreground">Fetched {new Date(data.fetchedAt).toLocaleString()} · source: public API</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => navigate('/dashboard/analytics', { state: { exploreProfile: data } })} className="rounded-xl"><BarChart3 className="mr-2 h-4 w-4"/> Analyze this profile</Button><Button variant="outline" onClick={() => navigate('/dashboard/compare', { state: { exploreProfile: data } })} className="rounded-xl"><GitCompareArrows className="mr-2 h-4 w-4"/> Compare</Button></div></section>
          <PublicProfileCard data={data}/>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{metrics.slice(0, 4).map((metric) => <Card key={metric.label} className="border-border bg-card/80"><CardContent className="p-5"><p className="text-xs text-muted-foreground">{metric.label}</p><p className="mt-2 text-2xl font-bold">{typeof metric.value === 'number' ? formatNumber(metric.value) : metric.value}</p><p className="mt-1 text-[11px] text-muted-foreground">{metric.description || 'Returned by the public source'}</p></CardContent></Card>)}</section>
          <section className="grid gap-5 lg:grid-cols-[2fr_1fr]">
            <Card className="border-border bg-card/80"><CardContent className="p-5 sm:p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Activity</p><h3 className="mt-1 font-semibold">Public activity returned by the source</h3></div><Badge variant="outline"><Zap className="mr-1 h-3 w-3"/>{data.activity.length} events</Badge></div><div className="mt-5 h-64">{activity.length > 1 ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={activity}><defs><linearGradient id="exploreActivity" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.28}/><stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false}/><XAxis dataKey="date" tick={{fontSize:10}} tickFormatter={(v)=>String(v).slice(5)}/><YAxis allowDecimals={false} tick={{fontSize:10}}/><Tooltip contentStyle={{borderRadius:12,border:'1px solid hsl(var(--border))',background:'hsl(var(--card))'}}/><Area dataKey="count" type="monotone" stroke="hsl(var(--primary))" fill="url(#exploreActivity)" strokeWidth={2}/></AreaChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">No dated activity was returned.</div>}</div></CardContent></Card>
            <Card className="border-border bg-card/80"><CardContent className="p-5 sm:p-6"><div className="flex items-center gap-2"><Trophy className="h-4 w-4 text-orange-500"/><h3 className="font-semibold">Returned breakdowns</h3></div>{data.breakdowns?.length ? <div className="mt-4 space-y-4">{data.breakdowns.slice(0,3).map((breakdown) => <div key={breakdown.label}><p className="text-xs font-medium">{breakdown.label}</p><div className="mt-2 space-y-2">{breakdown.items.slice(0,5).map((item) => <div key={item.label}><div className="flex justify-between text-[11px]"><span className="truncate">{item.label}</span><span>{formatNumber(item.value)}</span></div><div className="mt-1 h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{width:`${Math.min(100,item.percentage ?? (Math.max(item.value,0)/(Math.max(...breakdown.items.map(x=>x.value),1))*100))}%`}}/></div></div>)}</div></div>)}</div> : <div className="mt-5 rounded-xl border border-dashed border-border p-5 text-center text-xs text-muted-foreground">This platform does not currently return grouped breakdowns for this profile.</div>}</CardContent></Card>
          </section>
          {data.repositories?.length ? <section><div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Repositories</p><h3 className="mt-1 text-lg font-semibold">Public work returned by the source</h3></div><Badge variant="outline"><Database className="mr-1 h-3 w-3"/>{data.repositories.length}</Badge></div><div className="grid gap-3 md:grid-cols-2">{data.repositories.slice(0,6).map((repo) => <a key={repo.name} href={repo.url} target="_blank" rel="noreferrer" className="group rounded-2xl border border-border bg-card/70 p-4 transition hover:-translate-y-0.5 hover:border-primary/30"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold">{repo.name}</p><p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{repo.description || 'No description returned.'}</p></div><ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-1"/></div><div className="mt-4 flex flex-wrap gap-3 text-[11px] text-muted-foreground"><span>{repo.language || 'Unknown language'}</span><span>★ {formatNumber(repo.stars)}</span><span>⑂ {formatNumber(repo.forks)}</span></div></a>)}</div></section> : null}
          <section className="grid gap-4 md:grid-cols-3"><Card className="border-border bg-card/60"><CardContent className="p-5"><BarChart3 className="h-5 w-5 text-primary"/><h3 className="mt-3 font-semibold">Individual analysis</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">Open analysis with this exact fetched profile preselected.</p><Button variant="ghost" className="mt-3 px-0" onClick={() => navigate('/dashboard/analytics',{state:{exploreProfile:data}})}>Analyze now <ArrowRight className="ml-1 h-3 w-3"/></Button></CardContent></Card><Card className="border-border bg-card/60"><CardContent className="p-5"><Users className="h-5 w-5 text-primary"/><h3 className="mt-3 font-semibold">Combined analysis</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">Add this profile to the comparison workspace and select other profiles.</p><Button variant="ghost" className="mt-3 px-0" onClick={() => navigate('/dashboard/compare',{state:{exploreProfile:data}})}>Compare now <ArrowRight className="ml-1 h-3 w-3"/></Button></CardContent></Card><Card className="border-border bg-card/60"><CardContent className="p-5"><Globe2 className="h-5 w-5 text-primary"/><h3 className="mt-3 font-semibold">Source truth</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">APIVue displays normalized values actually returned by the public source.</p><a href={data.profile.profileUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center text-xs font-medium text-primary">Open source <ArrowRight className="ml-1 h-3 w-3"/></a></CardContent></Card></section>
        </div> : <section className="grid gap-4 sm:grid-cols-3">{[['Profile intelligence','Real profile header, source link and metrics.'],['Interactive data','Activity, breakdowns and repositories when the API exposes them.'],['Analysis ready','Send the exact fetched result into Analyze or Compare.']].map(([title,text],i)=><Card key={title} className="border-border bg-card/50"><CardContent className="p-5"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-xs font-bold text-primary">0{i+1}</div><h3 className="mt-4 font-semibold">{title}</h3><p className="mt-2 text-xs leading-5 text-muted-foreground">{text}</p></CardContent></Card>)}</section>}
      </div>
    </div>
  );
}
