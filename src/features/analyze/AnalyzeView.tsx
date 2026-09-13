import { useEffect, useMemo, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, ArrowRight, BarChart3, CalendarDays, Check, Database, Info, RefreshCw, Sparkles, TrendingUp, Users } from 'lucide-react';
import { useProfileSnapshots, useTrackedProfiles } from '@/hooks/use-profiles';
import type { TrackedProfile } from '@/lib/integrations/registry';
import type { PublicDataResult } from '@/lib/public-data';
import { formatNumber, platformLabel, allActivity, numericMetrics } from '@/lib/analytics/dashboard-data';
import { getIntegration } from '@/lib/integrations/registry';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

function publicToTracked(data: PublicDataResult): TrackedProfile {
  return {
    id: `explored-${data.platform}-${data.profile.username}`,
    platform: data.platform,
    handle: data.profile.username,
    displayName: data.profile.displayName ?? data.profile.username,
    avatarUrl: data.profile.avatarUrl,
    profileUrl: data.profile.profileUrl,
    lastSyncedAt: data.fetchedAt,
    data: {
      bio: data.profile.bio ?? undefined,
      location: data.profile.location ?? undefined,
      joinedAt: data.profile.joinedAt ?? undefined,
      metrics: data.metrics.map((metric) => ({ key: metric.label.toLowerCase().replace(/[^a-z0-9]+/g, '_'), label: metric.label, value: metric.value })),
      activity: data.activity.map((item) => ({ date: item.timestamp.slice(0, 10), count: 1 })),
      breakdowns: (data.breakdowns ?? []).map((item) => ({ key: item.label, label: item.label, items: item.items })),
    },
  };
}

function metricNumber(profile: TrackedProfile, key: string) {
  const metric = profile.data?.metrics?.find((item) => item.key === key);
  return metric && typeof metric.value === 'number' ? metric.value : null;
}

export function AnalyzeView() {
  const location = useLocation();
  const { data: connected = [], isLoading, refetch } = useTrackedProfiles();
  const { data: snapshots = [] } = useProfileSnapshots();
  const explored = (location.state as { exploreProfile?: PublicDataResult } | null)?.exploreProfile;
  const exploredProfile = useMemo(() => explored ? publicToTracked(explored) : null, [explored]);
  const profiles = useMemo(() => exploredProfile ? [...connected, exploredProfile] : connected, [connected, exploredProfile]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (exploredProfile) setSelectedIds((current) => current.includes(exploredProfile.id) ? current : [exploredProfile.id]);
    else if (!selectedIds.length && connected.length) setSelectedIds([connected[0].id]);
    // Selection intentionally initializes once when data arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exploredProfile?.id, connected.length]);

  const selected = useMemo(() => profiles.filter((profile) => selectedIds.includes(profile.id)), [profiles, selectedIds]);
  const combined = selected.length > 1;
  const selectedActivity = useMemo(() => allActivity(selected), [selected]);
  const sharedMetrics = useMemo(() => {
    if (!selected.length) return [];
    const counts = new Map<string, { label: string; hits: number }>();
    selected.forEach((profile) => numericMetrics(profile).forEach((metric) => {
      const current = counts.get(metric.key);
      counts.set(metric.key, { label: metric.label, hits: (current?.hits ?? 0) + 1 });
    }));
    return Array.from(counts.entries()).filter(([, value]) => value.hits === selected.length).map(([key, value]) => ({ key, label: value.label }));
  }, [selected]);
  const chartRows = useMemo(() => sharedMetrics.slice(0, 8).map((metric) => ({ metric: metric.label, ...Object.fromEntries(selected.map((profile) => [profile.handle, metricNumber(profile, metric.key) ?? 0])) })), [sharedMetrics, selected]);
  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  if (isLoading) return <div className="min-h-full p-5 sm:p-6 lg:p-8"><div className="mx-auto max-w-7xl animate-pulse space-y-5"><div className="h-9 w-64 rounded bg-muted"/><div className="h-5 w-96 max-w-full rounded bg-muted"/><div className="h-44 rounded-2xl bg-muted"/><div className="h-64 rounded-2xl bg-muted"/></div></div>;

  const toggle = (id: string) => setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const selectAll = () => setSelectedIds(profiles.map((profile) => profile.id));

  return (
    <div className="relative min-h-full overflow-hidden">
      <div className="pointer-events-none absolute -left-40 top-0 h-96 w-96 rounded-full bg-violet-500/[0.06] blur-3xl" />
      <div className="relative mx-auto max-w-7xl space-y-6 p-5 sm:p-6 lg:p-8">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><div className="mb-3 flex flex-wrap gap-2"><Badge variant="outline" className="border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-300"><BarChart3 className="mr-1.5 h-3 w-3"/> Analysis workspace</Badge><Badge variant="outline">{selected.length} selected</Badge></div><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Analyze what you choose.</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">Select one source for individual analysis or multiple sources for combined analysis. Every number below comes from the selected profile data.</p></div><div className="flex items-center gap-2 rounded-lg border border-border bg-card/60 px-3 py-2 text-xs text-muted-foreground"><CalendarDays className="h-3.5 w-3.5"/>{today}</div></header>

        <Card className="border-border bg-card/70"><CardContent className="p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">01 · Choose analysis scope</p><h2 className="mt-1 text-lg font-semibold">Connected and explored profiles</h2></div><div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={selectAll} disabled={!profiles.length}>Select all</Button><Button variant="ghost" size="sm" onClick={() => setSelectedIds([])} disabled={!selected.length}>Clear</Button><Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2"><RefreshCw className="h-3.5 w-3.5"/> Refresh</Button></div></div><div className="mt-4 flex flex-wrap gap-2">{profiles.length ? profiles.map((profile) => { const active = selectedIds.includes(profile.id); const Icon = getIntegration(profile.platform).icon; return <button type="button" key={profile.id} onClick={() => toggle(profile.id)} className={`group flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition hover:-translate-y-0.5 ${active ? 'border-primary bg-primary/5 shadow-sm' : 'border-border bg-background hover:border-primary/30'}`}><span className={`flex h-7 w-7 items-center justify-center rounded-lg ${active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}><Icon className="h-3.5 w-3.5"/></span><span><span className="block max-w-[170px] truncate text-xs font-medium">{profile.displayName || profile.handle}</span><span className="block text-[10px] text-muted-foreground">{platformLabel(profile.platform)} · @{profile.handle}</span></span>{active && <Check className="h-3.5 w-3.5 text-primary"/>}</button> }) : <div className="w-full rounded-xl border border-dashed border-border p-6 text-center"><Database className="mx-auto h-7 w-7 text-muted-foreground/40"/><p className="mt-2 text-sm font-medium">No connected profile is available.</p><p className="mt-1 text-xs text-muted-foreground">Connect a source or explore a public profile first.</p><Link to="/dashboard/integrations"><Button size="sm" className="mt-3">Connect a platform <ArrowRight className="ml-1 h-3.5 w-3.5"/></Button></Link></div>}</div></CardContent></Card>

        {!selected.length ? <Card className="border-dashed bg-card/40"><CardContent className="p-12 text-center"><BarChart3 className="mx-auto h-10 w-10 text-muted-foreground/40"/><h2 className="mt-4 font-semibold">Choose at least one profile</h2><p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">One selection gives you individual analysis. Two or more turns this page into a combined analysis workspace.</p></CardContent></Card> : <>
          <section className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-primary">02 · {combined ? 'Combined analysis' : 'Individual analysis'}</p><h2 className="mt-1 text-xl font-semibold">{combined ? `${selected.length} profiles side by side` : `${selected[0].displayName || selected[0].handle}`}</h2></div><Badge variant="outline" className="gap-1.5"><Sparkles className="h-3 w-3"/>{combined ? 'Cross-source view' : 'Profile view'}</Badge></section>

          {!combined ? <>
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{numericMetrics(selected[0]).slice(0, 8).map((metric) => <Card key={metric.key} className="border-border bg-card/80"><CardContent className="p-5"><p className="text-xs text-muted-foreground">{metric.label}</p><p className="mt-2 text-2xl font-bold">{formatNumber(metric.value)}</p><p className="mt-1 text-[10px] text-muted-foreground">Real returned metric</p></CardContent></Card>)}</section>
            <section className="grid gap-5 lg:grid-cols-[2fr_1fr]"><Card className="border-border bg-card/80"><CardContent className="p-5 sm:p-6"><div className="flex items-center gap-2"><Activity className="h-4 w-4 text-primary"/><h3 className="font-semibold">Individual activity</h3></div><div className="mt-5 h-64">{selectedActivity.length > 1 ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={selectedActivity}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false}/><XAxis dataKey="date" tick={{fontSize:10}} tickFormatter={(v)=>String(v).slice(5)}/><YAxis allowDecimals={false} tick={{fontSize:10}}/><Tooltip contentStyle={{borderRadius:12,border:'1px solid hsl(var(--border))',background:'hsl(var(--card))'}}/><Area dataKey="count" type="monotone" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.10)" strokeWidth={2}/></AreaChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">No dated activity history returned.</div>}</div></CardContent></Card><Card className="border-border bg-card/80"><CardContent className="p-5 sm:p-6"><div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-500"/><h3 className="font-semibold">Profile signals</h3></div><div className="mt-4 space-y-3">{(selected[0].data?.breakdowns ?? []).slice(0,4).map((breakdown)=><div key={breakdown.key} className="rounded-xl bg-muted/30 p-3"><p className="text-xs font-medium">{breakdown.label}</p><p className="mt-1 text-[11px] text-muted-foreground">{breakdown.items.slice(0,3).map((item)=>`${item.label}: ${formatNumber(item.value)}`).join(' · ')}</p></div>)}{!(selected[0].data?.breakdowns?.length) && <div className="rounded-xl border border-dashed border-border p-5 text-center text-xs text-muted-foreground">No grouped breakdowns were returned for this source.</div>}</div></CardContent></Card></section>
          </> : <>
            <section className="grid gap-4 md:grid-cols-3">{sharedMetrics.slice(0,3).map((metric) => { const values = selected.map((profile)=>metricNumber(profile, metric.key) ?? 0); const total = values.reduce((a,b)=>a+b,0); return <Card key={metric.key} className="border-border bg-card/80"><CardContent className="p-5"><p className="text-xs text-muted-foreground">Shared metric · {metric.label}</p><p className="mt-2 text-2xl font-bold">{formatNumber(total)}</p><p className="mt-1 text-[10px] text-muted-foreground">Combined across selected profiles</p></CardContent></Card>; })}</section>
            {sharedMetrics.length ? <Card className="border-border bg-card/80"><CardContent className="p-5 sm:p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Shared metrics</p><h3 className="mt-1 font-semibold">Only comparable numeric data</h3></div><Badge variant="outline">{sharedMetrics.length} shared</Badge></div><div className="mt-5 h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartRows} layout="vertical" margin={{left:20,right:20}}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false}/><XAxis type="number" tick={{fontSize:10}}/><YAxis type="category" dataKey="metric" width={110} tick={{fontSize:10}}/><Tooltip contentStyle={{borderRadius:12,border:'1px solid hsl(var(--border))',background:'hsl(var(--card))'}}/><Bar dataKey={selected[0].handle} fill="hsl(var(--primary))" radius={[0,4,4,0]}/>{selected.slice(1).map((profile,index)=><Bar key={profile.id} dataKey={profile.handle} fill={index % 2 ? 'hsl(280 67% 60%)' : 'hsl(199 89% 48%)'} radius={[0,4,4,0]}/>)}</BarChart></ResponsiveContainer></div></CardContent></Card> : <Card className="border-dashed bg-card/40"><CardContent className="p-8 text-center"><Info className="mx-auto h-7 w-7 text-muted-foreground/50"/><p className="mt-3 text-sm font-medium">No shared numeric metrics</p><p className="mt-1 text-xs text-muted-foreground">Select profiles from the same or compatible platforms to get a meaningful combined metric chart.</p></CardContent></Card>}
            <Card className="border-border bg-card/80"><CardContent className="p-5 sm:p-6"><div className="flex items-center gap-2"><Activity className="h-4 w-4 text-primary"/><h3 className="font-semibold">Combined activity</h3></div><div className="mt-5 h-64">{selectedActivity.length > 1 ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={selectedActivity}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false}/><XAxis dataKey="date" tick={{fontSize:10}} tickFormatter={(v)=>String(v).slice(5)}/><YAxis allowDecimals={false} tick={{fontSize:10}}/><Tooltip contentStyle={{borderRadius:12,border:'1px solid hsl(var(--border))',background:'hsl(var(--card))'}}/><Area dataKey="count" type="monotone" stroke="hsl(142 71% 45%)" fill="hsl(142 71% 45% / 0.10)" strokeWidth={2}/></AreaChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">Not enough shared activity history.</div>}</div></CardContent></Card>
          </>}

          <Card className="border-border bg-card/60"><CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center"><Info className="h-5 w-5 shrink-0 text-muted-foreground"/><div className="min-w-0 flex-1"><p className="text-sm font-medium">Analysis rule</p><p className="mt-1 text-xs leading-5 text-muted-foreground">APIVue never fills missing values with guesses. Combined charts use only metrics present on every selected profile; individual views use only data returned for that profile.</p></div><Link to="/dashboard/compare"><Button variant="outline" size="sm" className="gap-2">Open Compare <ArrowRight className="h-3.5 w-3.5"/></Button></Link></CardContent></Card>
        </>}
      </div>
    </div>
  );
}
