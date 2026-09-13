import { useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, CalendarRange, ExternalLink, Github, Sparkles } from 'lucide-react';

export type AnalyticsRange = '7d' | '30d' | '1y' | 'all';

export interface AnalyticsPoint {
  date: string;
  count: number;
  label?: string;
  type?: string;
}

const RANGES: Array<{ id: AnalyticsRange; label: string; days: number | null }> = [
  { id: '7d', label: '7 days', days: 7 },
  { id: '30d', label: '30 days', days: 30 },
  { id: '1y', label: '1 year', days: 365 },
  { id: 'all', label: 'All time', days: null },
];

function startOfToday() {
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  return now;
}

function rangeStart(range: AnalyticsRange) {
  const config = RANGES.find((item) => item.id === range);
  if (!config?.days) return null;
  const date = startOfToday();
  date.setDate(date.getDate() - config.days + 1);
  date.setHours(0, 0, 0, 0);
  return date;
}

function fillDaily(points: AnalyticsPoint[], range: AnalyticsRange) {
  const start = rangeStart(range);
  const end = startOfToday();
  const source = new Map(points.map((point) => [point.date.slice(0, 10), Math.max(0, Number(point.count) || 0)]));
  const first = start ?? (points.length ? new Date(`${points[0].date.slice(0, 10)}T00:00:00`) : end);
  const output: AnalyticsPoint[] = [];
  for (let cursor = new Date(first); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    const key = cursor.toISOString().slice(0, 10);
    output.push({ date: key, count: source.get(key) ?? 0 });
  }
  return output;
}

function shortDate(value: string, range: AnalyticsRange) {
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return range === '1y' || range === 'all'
    ? date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' })
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function TimeRangeTabs({ value, onChange }: { value: AnalyticsRange; onChange: (value: AnalyticsRange) => void }) {
  return (
    <div className="inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-border bg-muted/40 p-1">
      {RANGES.map((range) => (
        <button key={range.id} type="button" onClick={() => onChange(range.id)} className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-[11px] font-semibold transition ${value === range.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
          {range.label}
        </button>
      ))}
    </div>
  );
}

export function TimeRangeChart({ points, tone = 'hsl(var(--primary))', title = 'Activity', subtitle = 'Real activity returned by the source', compact = false }: { points: AnalyticsPoint[]; tone?: string; title?: string; subtitle?: string; compact?: boolean }) {
  const [range, setRange] = useState<AnalyticsRange>('30d');
  const chart = useMemo(() => fillDaily(points, range), [points, range]);
  const total = chart.reduce((sum, point) => sum + point.count, 0);
  const peak = chart.reduce((best, point) => point.count > best.count ? point : best, { date: '', count: 0 });
  const activeDays = chart.filter((point) => point.count > 0).length;
  const hasData = points.length > 0;

  return (
    <div className="rounded-3xl border border-border bg-card/70 p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-primary"><Activity className="h-4 w-4" /><span className="text-[11px] font-bold uppercase tracking-[0.18em]">Timeline analytics</span></div>
          <h3 className="mt-2 text-lg font-bold">{title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <TimeRangeTabs value={range} onChange={setRange} />
      </div>
      {hasData ? (
        <>
          <div className={`mt-5 ${compact ? 'h-56' : 'h-80'}`}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <defs><linearGradient id="apivueRangeFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={tone} stopOpacity={0.32} /><stop offset="100%" stopColor={tone} stopOpacity={0.02} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(value) => shortDate(String(value), range)} minTickGap={28} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={34} />
                <Tooltip contentStyle={{ borderRadius: 14, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} labelFormatter={(value) => new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, { dateStyle: 'medium' })} formatter={(value) => [Number(value).toLocaleString(), 'Activity']} />
                <Area type="monotone" dataKey="count" stroke={tone} fill="url(#apivueRangeFill)" strokeWidth={2.5} dot={false} activeDot={{ r: 5, strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-2xl border border-border bg-background/50 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Activity</p><p className="mt-1 text-lg font-bold">{total.toLocaleString()}</p></div>
            <div className="rounded-2xl border border-border bg-background/50 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Active days</p><p className="mt-1 text-lg font-bold">{activeDays.toLocaleString()}</p></div>
            <div className="rounded-2xl border border-border bg-background/50 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Peak day</p><p className="mt-1 truncate text-lg font-bold">{peak.count ? peak.count.toLocaleString() : '—'}</p></div>
          </div>
        </>
      ) : (
        <div className="mt-5 flex min-h-56 items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 p-8 text-center">
          <div><Sparkles className="mx-auto h-7 w-7 text-muted-foreground/40" /><p className="mt-3 text-sm font-semibold">No dated activity returned</p><p className="mt-1 max-w-md text-xs leading-5 text-muted-foreground">This chart never invents activity. Connect or refresh the source when it exposes a dated history.</p></div>
        </div>
      )}
    </div>
  );
}

export function GitHubContributionImage({ username, joinedAt }: { username: string; joinedAt?: string }) {
  const [range, setRange] = useState<AnalyticsRange>('1y');
  const end = new Date();
  const start = new Date(end);
  if (range === '7d') start.setDate(end.getDate() - 6);
  else if (range === '30d') start.setDate(end.getDate() - 29);
  else if (range === '1y') start.setDate(end.getDate() - 364);
  else if (joinedAt) {
    const joined = new Date(joinedAt);
    if (!Number.isNaN(joined.getTime())) start.setTime(joined.getTime());
  } else start.setFullYear(end.getFullYear() - 10);
  const from = start.toISOString().slice(0, 10);
  const to = end.toISOString().slice(0, 10);
  const url = `https://github.com/users/${encodeURIComponent(username)}/contributions?from=${from}&to=${to}`;

  return (
    <section className="overflow-hidden rounded-3xl border border-emerald-500/20 bg-card/80 shadow-lg shadow-emerald-500/5">
      <div className="border-b border-border bg-gradient-to-r from-emerald-500/10 via-transparent to-transparent p-5 sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-500"><Github className="h-5 w-5" /></div>
            <div>
              <div className="flex flex-wrap items-center gap-2"><span className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-500">GitHub analytics</span><span className="rounded-full border border-emerald-500/20 bg-emerald-500/5 px-2 py-0.5 text-[10px] font-semibold text-emerald-500">LIVE SOURCE</span></div>
              <h3 className="mt-1 text-xl font-black tracking-tight">Contribution activity</h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">The real GitHub contribution calendar for <span className="font-semibold text-foreground">@{username}</span>.</p>
            </div>
          </div>
          <TimeRangeTabs value={range} onChange={setRange} />
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-background/60 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Period</p><p className="mt-1 text-sm font-bold">{RANGES.find((item) => item.id === range)?.label}</p><p className="mt-1 text-[10px] text-muted-foreground">{from} → {to}</p></div>
          <div className="rounded-2xl border border-border bg-background/60 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Source</p><p className="mt-1 text-sm font-bold">GitHub profile</p><p className="mt-1 text-[10px] text-muted-foreground">Counts and levels come from GitHub.</p></div>
          <a href={`https://github.com/${encodeURIComponent(username)}`} target="_blank" rel="noreferrer" className="group rounded-2xl border border-border bg-background/60 p-4 transition hover:-translate-y-0.5 hover:border-emerald-500/30"><p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Open profile <ExternalLink className="h-3 w-3" /></p><p className="mt-1 text-sm font-bold group-hover:text-emerald-500">@{username}</p><p className="mt-1 text-[10px] text-muted-foreground">View the original GitHub source.</p></a>
        </div>

        <div className="mt-5 overflow-x-auto rounded-2xl border border-border bg-background/70 p-4 sm:p-5">
          <div className="min-w-[720px]">
            <img key={url} src={url} alt={`${username} GitHub contribution activity`} className="mx-auto block h-auto w-full max-w-[1100px]" loading="lazy" referrerPolicy="no-referrer" />
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 text-[10px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>GitHub controls the underlying contribution counts and color levels. APIVue does not synthesize them.</span>
          <span className="font-medium">7 days · 30 days · 1 year · All time</span>
        </div>
      </div>
    </section>
  );
}
