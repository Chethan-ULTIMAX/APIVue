import { useMemo, useState } from 'react';
import { Flame, Github, GitPullRequest, MessageSquare, Sparkles } from 'lucide-react';
import type { GitHubContributionAnalytics as GitHubContributionData, GitHubContributionDay } from '@/lib/public-data/types';

export type GitHubAnalyticsRange = '7d' | '30d' | '1y' | 'all';

const RANGE_LABELS: Record<GitHubAnalyticsRange, string> = { '7d': '7 days', '30d': '30 days', '1y': '1 year', all: 'All time' };

function dateKey(date: Date) { return date.toISOString().slice(0, 10); }
function startFor(range: GitHubAnalyticsRange, days: GitHubContributionDay[]) {
  if (range === 'all') return days[0]?.date ?? dateKey(new Date());
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - (range === '7d' ? 6 : range === '30d' ? 29 : 364));
  return dateKey(date);
}
function levelFor(count: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  if (max <= 1) return 4;
  const ratio = count / max;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}
function longestStreak(days: GitHubContributionDay[]) {
  let best = 0; let run = 0;
  for (const day of days) { run = day.count > 0 ? run + 1 : 0; best = Math.max(best, run); }
  return best;
}
function currentStreak(days: GitHubContributionDay[]) {
  let run = 0;
  for (let i = days.length - 1; i >= 0; i -= 1) { if (days[i].count > 0) run += 1; else break; }
  return run;
}
function formatDate(value: string) { return new Date(`${value}T00:00:00Z`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }); }

export function GitHubContributionAnalytics({ username, data }: { username: string; data: GitHubContributionData }) {
  const [range, setRange] = useState<GitHubAnalyticsRange>('30d');
  const selected = useMemo(() => {
    const start = startFor(range, data.days);
    return data.days.filter((day) => day.date >= start).sort((a, b) => a.date.localeCompare(b.date));
  }, [data.days, range]);
  const max = Math.max(...selected.map((day) => day.count), 1);
  const total = selected.reduce((sum, day) => sum + day.count, 0);
  const active = selected.filter((day) => day.count > 0).length;
  const streak = currentStreak(selected);
  const longest = longestStreak(selected);
  const average = active ? total / active : 0;
  const strongest = selected.reduce<GitHubContributionDay | null>((best, day) => !best || day.count > best.count ? day : best, null);
  const cells = useMemo(() => {
    if (!selected.length) return [] as GitHubContributionDay[][];
    const byDate = new Map(selected.map((day) => [day.date, day]));
    const first = new Date(`${selected[0].date}T00:00:00Z`);
    const last = new Date(`${selected[selected.length - 1].date}T00:00:00Z`);
    first.setUTCDate(first.getUTCDate() - first.getUTCDay());
    last.setUTCDate(last.getUTCDate() + (6 - last.getUTCDay()));
    const weeks: GitHubContributionDay[][] = [];
    for (let cursor = new Date(first); cursor <= last; cursor.setUTCDate(cursor.getUTCDate() + 7)) {
      const week: GitHubContributionDay[] = [];
      for (let d = 0; d < 7; d += 1) {
        const date = new Date(cursor); date.setUTCDate(cursor.getUTCDate() + d);
        const key = dateKey(date); const existing = byDate.get(key);
        week.push(existing ?? { date: key, count: 0, level: 0 });
      }
      weeks.push(week);
    }
    return weeks;
  }, [selected]);
  const contributionTypes = [
    { label: 'Commits', value: data.totalCommits, icon: Github, className: 'bg-emerald-500' },
    { label: 'Pull requests', value: data.totalPullRequests, icon: GitPullRequest, className: 'bg-violet-500' },
    { label: 'Issues', value: data.totalIssues, icon: MessageSquare, className: 'bg-orange-500' },
    { label: 'Reviews', value: data.totalReviews, icon: Sparkles, className: 'bg-pink-500' },
  ];
  const typeTotal = contributionTypes.reduce((sum, item) => sum + item.value, 0);

  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      <div className="border-b border-border bg-gradient-to-r from-emerald-500/10 via-transparent to-orange-500/5 p-5 sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-500"><Github className="h-5 w-5" /></div>
            <div>
              <div className="flex flex-wrap items-center gap-2"><span className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-500">GitHub analytics</span><span className="rounded-full border border-emerald-500/20 bg-emerald-500/5 px-2 py-0.5 text-[10px] font-semibold text-emerald-500">LIVE DATA</span></div>
              <h3 className="mt-1 text-xl font-black tracking-tight">Contribution activity</h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">Real contribution counts collected for <span className="font-semibold text-foreground">@{username}</span>. APIVue never generates missing days.</p>
            </div>
          </div>
          <div className="inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-border bg-background/70 p-1">
            {(Object.keys(RANGE_LABELS) as GitHubAnalyticsRange[]).map((item) => <button key={item} type="button" onClick={() => setRange(item)} className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-[11px] font-semibold transition ${range === item ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>{RANGE_LABELS[item]}</button>)}
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[['Contributions', total.toLocaleString()], ['Active days', active.toLocaleString()], ['Avg / active day', average ? average.toFixed(1) : '0'], ['Longest streak', `${longest} days`]].map(([label, value]) => <div key={label} className="group rounded-2xl border border-border bg-background/60 p-4 transition hover:-translate-y-0.5 hover:border-emerald-500/30 hover:shadow-md"><p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-black tabular-nums tracking-tight">{value}</p></div>)}
        </div>

        <div className="mt-4 rounded-2xl border border-border bg-background/70 p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><p className="text-sm font-semibold">Contribution calendar</p><p className="mt-1 text-[11px] text-muted-foreground">{total.toLocaleString()} contributions in the selected period</p></div><div className="flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-[11px] font-semibold text-orange-500"><Flame className="h-3.5 w-3.5"/>Current streak: {streak} days</div></div>
          <div className="overflow-x-auto pb-2 [scrollbar-width:thin]"><div className="min-w-max">
            <div className="mb-1 ml-8 flex gap-[3px] text-[9px] font-medium text-muted-foreground">{cells.map((week, index) => index % 4 === 0 ? <span key={week[0].date} className="w-[11px]">{new Date(`${week[0].date}T00:00:00Z`).toLocaleDateString(undefined, { month: 'short', timeZone: 'UTC' })}</span> : <span key={week[0].date} className="w-[11px]"/> )}</div>
            <div className="flex gap-2"><div className="flex w-6 shrink-0 flex-col justify-between py-0.5 text-[9px] text-muted-foreground"><span>Mon</span><span>Wed</span><span>Fri</span></div><div className="flex gap-[3px]">{cells.map((week) => <div key={week[0].date} className="flex flex-col gap-[3px]">{week.map((day) => { const level = day.count === 0 ? 0 : levelFor(day.count, max); return <div key={day.date} title={`${day.count.toLocaleString()} contribution${day.count === 1 ? '' : 's'} on ${formatDate(day.date)}`} tabIndex={0} aria-label={`${day.count} contributions on ${formatDate(day.date)}`} className={`h-[11px] w-[11px] rounded-[2.5px] outline-none transition duration-150 hover:scale-125 hover:ring-2 hover:ring-emerald-500/50 focus:scale-125 focus:ring-2 focus:ring-emerald-500/60 ${['bg-muted', 'bg-emerald-200 dark:bg-emerald-950', 'bg-emerald-400 dark:bg-emerald-800', 'bg-emerald-600 dark:bg-emerald-600', 'bg-emerald-800 dark:bg-emerald-400'][level]}`} />; })}</div>)}</div></div>
          </div></div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[10px] text-muted-foreground"><span>Less <span className="mx-1 inline-block h-[11px] w-[11px] rounded-[2.5px] bg-muted align-middle"/> <span className="mx-0.5 inline-block h-[11px] w-[11px] rounded-[2.5px] bg-emerald-200 dark:bg-emerald-950 align-middle"/><span className="mx-0.5 inline-block h-[11px] w-[11px] rounded-[2.5px] bg-emerald-400 dark:bg-emerald-800 align-middle"/><span className="mx-0.5 inline-block h-[11px] w-[11px] rounded-[2.5px] bg-emerald-600 dark:bg-emerald-600 align-middle"/><span className="mx-0.5 inline-block h-[11px] w-[11px] rounded-[2.5px] bg-emerald-800 dark:bg-emerald-400 align-middle"/> More</span>{strongest && <span>Strongest day: <strong className="text-foreground">{strongest.count}</strong> · {formatDate(strongest.date)}</span>}</div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-background/60 p-5"><div className="mb-4 flex items-center gap-2"><Sparkles className="h-4 w-4 text-violet-500"/><h4 className="text-sm font-bold">Contribution breakdown</h4></div><div className="flex h-2 overflow-hidden rounded-full bg-muted">{contributionTypes.map((item) => <div key={item.label} className={item.className} style={{ width: `${typeTotal ? (item.value / typeTotal) * 100 : 0}%` }} />)}</div><div className="mt-4 space-y-2">{contributionTypes.map((item) => { const Icon = item.icon; return <div key={item.label} className="flex items-center justify-between text-xs"><span className="flex items-center gap-2 font-medium"><span className={`h-2.5 w-2.5 rounded-full ${item.className}`} /><Icon className="h-3.5 w-3.5 text-muted-foreground"/>{item.label}</span><span className="font-mono text-muted-foreground">{item.value.toLocaleString()}</span></div>; })}</div></div>
          <div className="rounded-2xl border border-border bg-background/60 p-5"><div className="mb-4 flex items-center gap-2"><Flame className="h-4 w-4 text-orange-500"/><h4 className="text-sm font-bold">Consistency</h4></div><div className="grid grid-cols-2 gap-3"><div className="rounded-xl bg-muted/40 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Current streak</p><p className="mt-1 text-xl font-black">{streak} days</p></div><div className="rounded-xl bg-muted/40 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Longest streak</p><p className="mt-1 text-xl font-black">{longest} days</p></div><div className="rounded-xl bg-muted/40 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Active days</p><p className="mt-1 text-xl font-black">{active}</p></div><div className="rounded-xl bg-muted/40 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Avg / active</p><p className="mt-1 text-xl font-black">{average.toFixed(1)}</p></div></div></div>
        </div>
      </div>
    </section>
  );
}
