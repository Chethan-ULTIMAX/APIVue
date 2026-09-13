import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, ArrowRight, BarChart3, Brain, CalendarDays, Database, GitCompareArrows, Lock, Plus, Radar, RefreshCw, Sparkles, Target, TrendingUp, Users, Zap } from 'lucide-react';
import { useProfileSnapshots, useTrackedProfiles } from '@/hooks/use-profiles';
import { formatNumber, formatRelativeDate, platformLabel, recentActivity, allActivity, numericMetrics, snapshotDelta } from '@/lib/analytics/dashboard-data';
import { getIntegration } from '@/lib/integrations/registry';
import type { TrackedProfile } from '@/lib/integrations/registry';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const accents = ['violet', 'blue', 'orange', 'emerald', 'cyan'];
const accentClasses = [
  'border-violet-500/25 bg-violet-500/[0.05] text-violet-600 dark:text-violet-400',
  'border-blue-500/25 bg-blue-500/[0.05] text-blue-600 dark:text-blue-400',
  'border-orange-500/25 bg-orange-500/[0.05] text-orange-600 dark:text-orange-400',
  'border-emerald-500/25 bg-emerald-500/[0.05] text-emerald-600 dark:text-emerald-400',
  'border-cyan-500/25 bg-cyan-500/[0.05] text-cyan-600 dark:text-cyan-400',
];

function metricValue(profile: TrackedProfile, key: string) {
  const metric = profile.data?.metrics?.find((item) => item.key === key);
  return metric && typeof metric.value === 'number' ? metric.value : null;
}

function ProfileStatCard({ profile, index, snapshots }: { profile: TrackedProfile; index: number; snapshots: ReturnType<typeof useProfileSnapshots>['data'] extends Array<infer T> ? T[] : never[] }) {
  const metrics = numericMetrics(profile).slice(0, 3);
  const integration = getIntegration(profile.platform);
  const main = metrics[0];
  const delta = main ? snapshotDelta(snapshots ?? [], profile.id, main.key) : null;
  const classes = accentClasses[index % accentClasses.length];

  return (
    <Card className={`group overflow-hidden border bg-card/80 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${classes.split(' ').slice(0, 1).join(' ')}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${classes}`}>
            <integration.icon className="h-5 w-5" />
          </div>
          <Badge variant="outline" className="text-[10px]">{platformLabel(profile.platform)}</Badge>
        </div>
        <div className="mt-4 min-w-0">
          <p className="truncate text-xs text-muted-foreground">{profile.displayName || profile.handle}</p>
          <p className="truncate text-sm font-medium">@{profile.handle}</p>
        </div>
        {main ? (
          <div className="mt-4 flex items-end gap-2">
            <p className="text-3xl font-bold tracking-tight">{formatNumber(main.value)}</p>
            {delta && delta.delta !== 0 && <span className={`mb-1 text-xs font-medium ${delta.delta > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{delta.delta > 0 ? '+' : ''}{formatNumber(delta.delta)} history</span>}
          </div>
        ) : <p className="mt-4 text-sm text-muted-foreground">No numeric metrics returned</p>}
        <p className="mt-1 text-xs text-muted-foreground">{main?.label ?? 'Public profile data'}</p>
        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border pt-4">
          {metrics.slice(1).map((metric) => <div key={metric.key}><p className="text-sm font-semibold">{formatNumber(metric.value)}</p><p className="truncate text-[10px] text-muted-foreground">{metric.label}</p></div>)}
          {profile.lastSyncedAt && <div className="text-right"><p className="text-sm font-medium">{formatRelativeDate(profile.lastSyncedAt)}</p><p className="text-[10px] text-muted-foreground">last synced</p></div>}
        </div>
      </CardContent>
    </Card>
  );
}

export function OverviewView() {
  const { data: profiles = [], isLoading, refetch } = useTrackedProfiles();
  const { data: snapshots = [] } = useProfileSnapshots();
  const activity = useMemo(() => allActivity(profiles), [profiles]);
  const recent = useMemo(() => recentActivity(profiles, 6), [profiles]);
  const totalProfiles = profiles.length;
  const numericCount = useMemo(() => profiles.reduce((sum, p) => sum + numericMetrics(p).length, 0), [profiles]);
  const activityTotal = activity.reduce((sum, point) => sum + point.count, 0);
  const latestActivity = activity.slice(-30);
  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const platformSummary = useMemo(() => profiles.map((profile) => ({
    profile,
    metrics: numericMetrics(profile),
    activity: profile.data?.activity?.reduce((sum, item) => sum + (Number(item.count) || 0), 0) ?? 0,
  })), [profiles]);

  if (isLoading) return <div className="min-h-full p-5 sm:p-6 lg:p-8"><div className="mx-auto max-w-7xl space-y-5 animate-pulse"><div className="h-9 w-72 rounded-lg bg-muted" /><div className="h-5 w-[32rem] max-w-full rounded bg-muted" /><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{[1,2,3,4,5,6].map((i) => <div key={i} className="h-52 rounded-2xl bg-muted" />)}</div></div></div>;

  return (
    <div className="relative min-h-full overflow-hidden">
      <div className="pointer-events-none absolute -left-40 top-0 h-96 w-96 rounded-full bg-violet-500/[0.07] blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-20 h-80 w-80 rounded-full bg-blue-500/[0.05] blur-3xl" />
      <div className="relative mx-auto max-w-7xl space-y-7 p-5 sm:p-6 lg:p-8">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge variant="outline" className="border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300"><Sparkles className="mr-1.5 h-3 w-3" /> Personal Intelligence</Badge>
              <Badge variant="outline" className={totalProfiles ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : ''}>{totalProfiles} connected</Badge>
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Your intelligence dashboard</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">Real data from the platforms you connected, transformed into one view of your developer activity.</p>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card/70 px-3 py-2 text-xs text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" />{today}</div>
        </header>

        {!totalProfiles ? (
          <Card className="relative overflow-hidden border-violet-500/30 bg-gradient-to-br from-violet-500/[0.06] via-card to-card"><CardContent className="p-6 sm:p-8"><div className="grid gap-7 lg:grid-cols-[1fr_auto] lg:items-center"><div><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10"><Radar className="h-6 w-6 text-violet-500" /></div><h2 className="mt-5 text-2xl font-semibold">Connect a platform to build your real dashboard.</h2><p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">There are no connected profiles yet, so APIVue intentionally shows no invented statistics. Connect GitHub, Codeforces, or another supported source and these cards will populate from the returned data.</p><div className="mt-5 flex flex-wrap gap-3"><Link to="/dashboard/integrations"><Button className="gap-2"><Plus className="h-4 w-4" /> Connect your first platform <ArrowRight className="h-4 w-4" /></Button></Link><Link to="/dashboard/explore"><Button variant="outline" className="gap-2">Explore public data <ArrowRight className="h-4 w-4" /></Button></Link></div></div><div className="rounded-2xl border border-border bg-muted/40 p-5 lg:w-80"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Live pipeline</p><div className="mt-5 space-y-4">{[['Connect','Authorized/public source'],['Normalize','Common APIVue metrics'],['Understand','Charts + analysis']].map(([a,b], i) => <div key={a} className="flex gap-3"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background text-xs font-bold">0{i+1}</div><div><p className="text-sm font-medium">{a}</p><p className="text-xs text-muted-foreground">{b}</p></div></div>)}</div></div></div></CardContent></Card>
        ) : (
          <Card className="border-emerald-500/20 bg-emerald-500/[0.03]"><CardContent className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10"><Database className="h-5 w-5 text-emerald-600" /></div><div><p className="font-semibold">Live connected data</p><p className="text-xs text-muted-foreground">{totalProfiles} source{totalProfiles === 1 ? '' : 's'} · {numericCount} numeric metrics · {formatNumber(activityTotal)} activity count{activityTotal === 1 ? '' : 's'}</p></div></div><Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2"><RefreshCw className="h-3.5 w-3.5" /> Refresh</Button></CardContent></Card>
        )}

        {totalProfiles > 0 && <>
          <section>
            <div className="mb-4 flex items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Connected sources</p><h2 className="mt-1 text-xl font-semibold">Your real platform metrics</h2></div><Link to="/dashboard/profiles" className="text-xs font-medium text-primary hover:underline">View all profiles <ArrowRight className="ml-1 inline h-3 w-3" /></Link></div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{profiles.map((profile, index) => <ProfileStatCard key={profile.id} profile={profile} index={index} snapshots={snapshots} />)}</div>
          </section>

          <section className="grid gap-5 lg:grid-cols-[2fr_1fr]">
            <Card className="overflow-hidden border-border bg-card/80"><CardContent className="p-5 sm:p-6"><div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center"><div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Activity trends</p><h2 className="mt-1 text-lg font-semibold">What your connected sources are returning</h2></div><Badge variant="outline">{latestActivity.length ? `${latestActivity.length} active days` : 'No activity history'}</Badge></div><div className="mt-5 h-64">{latestActivity.length > 1 ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={latestActivity}><defs><linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.24}/><stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false}/><XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => String(v).slice(5)} /><YAxis allowDecimals={false} tick={{ fontSize: 10 }} /><Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} /><Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fill="url(#activityFill)" strokeWidth={2} /></AreaChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 text-center"><div><Activity className="mx-auto h-8 w-8 text-muted-foreground/40"/><p className="mt-2 text-sm font-medium">Not enough activity history yet</p><p className="mt-1 text-xs text-muted-foreground">APIVue will chart this when connected sources return dated activity.</p></div></div>}</div></CardContent></Card>
            <Card className="border-border bg-card/80"><CardContent className="p-5 sm:p-6"><div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-500"/><h2 className="text-sm font-semibold">Source health</h2></div><div className="mt-4 space-y-3">{platformSummary.map(({ profile, metrics: ms, activity: count }) => <div key={profile.id} className="rounded-xl border border-border bg-muted/20 p-3"><div className="flex items-center justify-between gap-2"><span className="text-sm font-medium">{platformLabel(profile.platform)}</span><span className="h-2 w-2 rounded-full bg-emerald-500" /></div><p className="mt-1 truncate text-xs text-muted-foreground">{profile.handle}</p><div className="mt-3 flex justify-between text-[11px] text-muted-foreground"><span>{ms.length} metrics</span><span>{formatNumber(count)} activity</span></div></div>)}</div></CardContent></Card>
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <Card className="border-border bg-card/80"><CardContent className="p-5 sm:p-6"><div className="flex items-center gap-2"><Activity className="h-4 w-4 text-blue-500"/><h2 className="text-sm font-semibold">Recent returned activity</h2></div><div className="mt-4 divide-y divide-border">{recent.length ? recent.map((item, index) => <div key={`${item.handle}-${item.date}-${index}`} className="flex items-center gap-3 py-3"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-semibold">{getIntegration(item.platform).name.slice(0,1)}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{item.displayName}</p><p className="text-xs text-muted-foreground">{platformLabel(item.platform)} · {formatNumber(item.count)} activity count</p></div><span className="shrink-0 text-[11px] text-muted-foreground">{formatRelativeDate(item.date)}</span></div>) : <p className="py-8 text-center text-sm text-muted-foreground">No dated activity returned yet.</p>}</div></CardContent></Card>
            <Card className="border-border bg-card/80"><CardContent className="p-5 sm:p-6"><div className="flex items-center gap-2"><Brain className="h-4 w-4 text-orange-500"/><h2 className="text-sm font-semibold">Intelligence actions</h2></div><div className="mt-4 grid gap-3 sm:grid-cols-2">{[{href:'/dashboard/analytics', icon:BarChart3, title:'Analyze', text:'Select one or all connected sources and inspect real metrics.'},{href:'/dashboard/compare', icon:GitCompareArrows, title:'Compare', text:'Choose profiles and compare only the metrics they share.'},{href:'/dashboard/explore', icon:Users, title:'Explore', text:'Look up a public profile without connecting an account.'},{href:'/dashboard/goals', icon:Target, title:'Goals', text:'Turn real metrics into measurable targets.'}].map(({href,icon:Icon,title,text}) => <Link key={href} to={href} className="group rounded-xl border border-border bg-muted/20 p-4 transition hover:-translate-y-0.5 hover:border-primary/30"><Icon className="h-4 w-4 text-primary"/><p className="mt-3 text-sm font-semibold">{title}<ArrowRight className="ml-1 inline h-3 w-3 transition group-hover:translate-x-1"/></p><p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p></Link>)}</div></CardContent></Card>
          </section>
        </>}

        <div className="flex flex-col gap-3 border-t border-border pt-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between"><span className="flex items-center gap-2"><Lock className="h-3.5 w-3.5 text-emerald-500"/>No invented dashboard statistics — empty states are intentional.</span><Link to="/dashboard/integrations" className="hover:text-foreground">Manage connections <ArrowRight className="ml-1 inline h-3 w-3"/></Link></div>
      </div>
    </div>
  );
}
