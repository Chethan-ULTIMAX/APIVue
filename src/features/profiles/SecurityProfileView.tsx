import { useMemo, useState } from 'react';
import { ExternalLink, ShieldCheck, RefreshCw, Trophy, Target, Layers3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ProfileSnapshot, TrackedProfile } from '@/lib/integrations/types';

function value(profile: TrackedProfile, key: string) { return profile.data?.metrics?.find(m => m.key === key)?.value; }
function n(profile: TrackedProfile, key: string) { const v = Number(value(profile, key)); return Number.isFinite(v) ? v : 0; }
function fmt(v: string | number | undefined) { return typeof v === 'number' ? v.toLocaleString() : v ?? '—'; }

export function SecurityProfileView({ profile, snapshots, refreshing, onRefresh }: { profile: TrackedProfile; snapshots: ProfileSnapshot[]; refreshing: boolean; onRefresh: () => void }) {
  const [showAll, setShowAll] = useState(false);
  const isThm = profile.platform === 'tryhackme';
  const metrics = profile.data?.metrics ?? [];
  const numericMetrics = metrics.filter(m => typeof m.value === 'number');
  const trend = useMemo(() => snapshots.filter(s => Object.keys(s.metrics ?? {}).length).slice(-12), [snapshots]);
  const maxTrend = Math.max(1, ...trend.flatMap(s => Object.values(s.metrics ?? {}).map(Number)));
  return <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
    <div className="rounded-3xl border bg-gradient-to-br from-emerald-500/[0.10] via-background to-background p-5 shadow-sm sm:p-7">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4"><div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border bg-emerald-500/10"><ShieldCheck className="h-9 w-9 text-emerald-600"/></div><div><div className="flex flex-wrap items-center gap-2"><Badge variant="outline" className="border-emerald-500/30">Public profile</Badge><Badge variant="outline">Cybersecurity</Badge></div><h1 className="mt-2 text-2xl font-bold tracking-tight">{profile.displayName || profile.handle}</h1><p className="text-sm text-muted-foreground">@{profile.handle}</p><p className="mt-1 text-xs text-muted-foreground">{profile.data?.dataNotice ?? 'Public platform data. Ownership is not verified by APIVue.'}</p></div></div>
        <div className="flex gap-2"><Button variant="outline" onClick={onRefresh} disabled={refreshing}><RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}/>Refresh</Button>{profile.profileUrl && <a href={profile.profileUrl} target="_blank" rel="noreferrer noopener"><Button><ExternalLink className="mr-2 h-4 w-4"/>Open profile</Button></a>}</div>
      </div>
    </div>
    {isThm && numericMetrics.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{metrics.slice(0, showAll ? metrics.length : 4).map(m => <div key={m.key} className="rounded-2xl border bg-card p-5"><p className="text-xs text-muted-foreground">{m.label}</p><p className="mt-2 text-2xl font-bold">{fmt(m.value)}</p></div>)}</div> : <div className="rounded-2xl border border-dashed p-7"><div className="flex items-start gap-3"><Layers3 className="mt-0.5 h-5 w-5 text-muted-foreground"/><div><h2 className="font-semibold">Platform-published data</h2><p className="mt-1 text-sm text-muted-foreground">APIVue has a verified public profile link for this source but does not fabricate unavailable metrics. Use the platform profile to inspect its current achievements and credentials.</p></div></div></div>}
    {isThm && metrics.length > 4 && <Button variant="ghost" size="sm" onClick={() => setShowAll(v => !v)}>{showAll ? 'Show less' : `Show ${metrics.length - 4} more metrics`}</Button>}
    {isThm && <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]"><div className="rounded-2xl border bg-card p-5"><div className="flex items-center gap-2"><Target className="h-4 w-4 text-emerald-600"/><h2 className="font-semibold">Metric history</h2></div>{trend.length < 2 ? <p className="mt-5 text-sm text-muted-foreground">Collecting trend history. Refreshes create snapshots for future comparisons.</p> : <div className="mt-5 space-y-3">{Object.keys(trend.at(-1)?.metrics ?? {}).slice(0, 5).map(key => { const vals = trend.map(s => Number(s.metrics[key] ?? 0)); const last = vals.at(-1) ?? 0; return <div key={key}><div className="flex justify-between text-xs"><span className="text-muted-foreground">{key.replaceAll('_',' ')}</span><span className="font-medium">{last.toLocaleString()}</span></div><div className="mt-1 h-2 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, (last / maxTrend) * 100)}%` }}/></div></div>})}</div>}</div><div className="rounded-2xl border bg-card p-5"><div className="flex items-center gap-2"><Trophy className="h-4 w-4 text-amber-600"/><h2 className="font-semibold">Highlights</h2></div><div className="mt-4 space-y-2">{(profile.data?.highlights ?? []).map((h, i) => <div key={`${h.title}-${i}`} className="rounded-xl border p-3"><p className="text-sm font-medium">{h.title}</p>{h.subtitle && <p className="mt-1 text-xs text-muted-foreground">{h.subtitle}</p>}</div>)}{!profile.data?.highlights?.length && <p className="text-sm text-muted-foreground">No additional highlights published.</p>}</div></div></div>}
  </div>;
}
