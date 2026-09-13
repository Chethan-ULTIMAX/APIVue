import { useMemo, useState } from 'react';
import { Flame, Github, GitPullRequest, MessageSquare, Sparkles } from 'lucide-react';
import type { GitHubContributionAnalytics as GitHubContributionData, GitHubContributionDay } from '@/lib/public-data/types';

export type GitHubAnalyticsRange = '7d' | '30d' | '1y' | 'all';
const RANGE_LABELS: Record<GitHubAnalyticsRange, string> = { '7d': '7 days', '30d': '30 days', '1y': '1 year', all: 'All time' };

function dateKey(date: Date) { return date.toISOString().slice(0, 10); }
function formatDate(value: string) { return new Date(`${value}T00:00:00Z`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }); }
function levelFor(count: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  if (max <= 1) return 4;
  const ratio = count / max;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}
function currentStreak(days: GitHubContributionDay[]) { let run = 0; for (let i = days.length - 1; i >= 0; i -= 1) { if (days[i].count > 0) run += 1; else break; } return run; }
function longestStreak(days: GitHubContributionDay[]) { let best = 0; let run = 0; for (const day of days) { run = day.count > 0 ? run + 1 : 0; best = Math.max(best, run); } return best; }

const sparkPaths = [
  'M0,20 L15,17 L30,19 L45,12 L60,14 L75,9 L90,6 L100,4',
  'M0,22 L15,20 L30,16 L45,17 L60,11 L75,8 L90,5 L100,2',
  'M0,18 L15,20 L30,17 L45,19 L60,15 L75,14 L90,12 L100,10',
  'M0,21 L15,14 L30,16 L45,10 L60,12 L75,7 L90,9 L100,3',
];

export function GitHubContributionAnalytics({ username, data }: { username: string; data: GitHubContributionData }) {
  const availableYears = useMemo(() => Array.from(new Set(data.days.map((day) => Number(day.date.slice(0, 4))))).sort((a, b) => b - a), [data.days]);
  const defaultYear = availableYears.includes(new Date().getUTCFullYear()) ? new Date().getUTCFullYear() : (availableYears[0] ?? new Date().getUTCFullYear());
  const [year, setYear] = useState(defaultYear);
  const [range, setRange] = useState<GitHubAnalyticsRange>('1y');

  const yearDays = useMemo(() => data.days.filter((day) => Number(day.date.slice(0, 4)) === year).sort((a, b) => a.date.localeCompare(b.date)), [data.days, year]);
  const selected = useMemo(() => {
    if (range === 'all') return data.days.slice().sort((a, b) => a.date.localeCompare(b.date));
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 365;
    const source = yearDays.length ? yearDays : data.days;
    return source.slice(-days);
  }, [data.days, range, yearDays]);
  const max = Math.max(...selected.map((day) => day.count), 1);
  const total = selected.reduce((sum, day) => sum + day.count, 0);
  const active = selected.filter((day) => day.count > 0).length;
  const streak = currentStreak(selected);
  const longest = longestStreak(selected);
  const average = active ? total / active : 0;
  const strongest = selected.reduce<GitHubContributionDay | null>((best, day) => !best || day.count > best.count ? day : best, null);

  const cells = useMemo(() => {
    const source = selected;
    if (!source.length) return [] as GitHubContributionDay[][];
    const byDate = new Map(source.map((day) => [day.date, day]));
    const first = new Date(`${source[0].date}T00:00:00Z`);
    const last = new Date(`${source[source.length - 1].date}T00:00:00Z`);
    first.setUTCDate(first.getUTCDate() - first.getUTCDay());
    last.setUTCDate(last.getUTCDate() + (6 - last.getUTCDay()));
    const weeks: GitHubContributionDay[][] = [];
    for (let cursor = new Date(first); cursor <= last; cursor.setUTCDate(cursor.getUTCDate() + 7)) {
      const week: GitHubContributionDay[] = [];
      for (let d = 0; d < 7; d += 1) {
        const date = new Date(cursor);
        date.setUTCDate(cursor.getUTCDate() + d);
        const key = dateKey(date);
        week.push(byDate.get(key) ?? { date: key, count: 0, level: 0 });
      }
      weeks.push(week);
    }
    return weeks;
  }, [selected]);

  const typeValues = [data.totalCommits, data.totalPullRequests, data.totalIssues, data.totalReviews];
  const hasTypeBreakdown = typeValues.some((value) => value !== null && value !== undefined);
  const contributionTypes = [
    { label: 'Commits', value: data.totalCommits ?? 0, icon: Github, className: 'bg-[#3fb950]' },
    { label: 'Pull requests', value: data.totalPullRequests ?? 0, icon: GitPullRequest, className: 'bg-[#8250df]' },
    { label: 'Issues', value: data.totalIssues ?? 0, icon: MessageSquare, className: 'bg-[#bc4c00]' },
    { label: 'Reviews', value: data.totalReviews ?? 0, icon: Sparkles, className: 'bg-[#bf3989]' },
  ];
  const typeTotal = contributionTypes.reduce((sum, item) => sum + item.value, 0);

  return <section className="apivue-github-analytics">
    <div className="apivue-heatmap-card">
      <div className="apivue-heatmap-header">
        <div>
          <div className="apivue-heatmap-title"><Github className="h-4 w-4"/>Contribution activity</div>
          <div className="apivue-heatmap-sub"><strong>{total.toLocaleString()}</strong> contributions in <strong>{year}</strong> · <span className="font-mono">@{username}</span></div>
        </div>
        <div className="apivue-year-selector">
          {availableYears.slice(0, 3).sort((a, b) => a - b).map((item) => <button key={item} type="button" disabled={!yearDays.length && item !== year} className={year === item ? 'active' : ''} onClick={() => setYear(item)}>{item}</button>)}
        </div>
      </div>
      <div className="apivue-heatmap-scroll">
        <div className="apivue-heatmap-inner">
          <div className="apivue-day-labels"><div></div><div>Mon</div><div></div><div>Wed</div><div></div><div>Fri</div><div></div></div>
          <div className="apivue-grid-area">
            <div className="apivue-month-labels">{cells.map((week, index) => index % 4 === 0 ? <span key={week[0].date} style={{ left: index * 14 }}>{new Date(`${week[0].date}T00:00:00Z`).toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })}</span> : null)}</div>
            <div className="apivue-grid">{cells.map((week) => <div className="apivue-week" key={week[0].date}>{week.map((day) => { const level = levelFor(day.count, max); return <div key={day.date} className={`apivue-cell lvl-${level}`} title={`${day.count.toLocaleString()} contribution${day.count === 1 ? '' : 's'} on ${formatDate(day.date)}`} aria-label={`${day.count} contributions on ${formatDate(day.date)}`}/>; })}</div>)}</div>
          </div>
        </div>
      </div>
      <div className="apivue-heatmap-legend"><div className="apivue-streak"><Flame className="h-3.5 w-3.5"/>Current streak: <span>{streak}</span> days</div><div className="apivue-legend-swatches"><span>Less</span>{[0,1,2,3,4].map((level) => <div key={level} className={`apivue-cell lvl-${level}`}/>)}<span>More</span></div></div>
    </div>

    <div className="apivue-stats-grid">
      {[['Contributions', total, '+'], ['Active days', active, ''], ['Avg / active day', average, ''], ['Longest streak', longest, ' days']].map(([label, value, suffix], index) => <div className="apivue-stat-tile" key={String(label)}><div className="apivue-stat-head"><span>{label}</span><Github className="h-3.5 w-3.5"/></div><div className="apivue-stat-value">{typeof value === 'number' ? (label === 'Avg / active day' ? value.toFixed(1) : Math.round(value).toLocaleString()) : value}{suffix === ' days' ? ' days' : ''}</div><svg viewBox="0 0 100 24" preserveAspectRatio="none" className="apivue-stat-spark"><path d={sparkPaths[index]} fill="none" stroke="#3fb950" strokeWidth="1.5" strokeLinecap="round"/></svg></div>)}
    </div>

    <div className="apivue-insight-card">
      <div className="apivue-insight-head"><Sparkles className="h-3.5 w-3.5"/> APIVue Insight · derived from real GitHub data</div>
      <div className="apivue-insight-text">Your selected period contains <strong>{active}</strong> active days, averaging <strong>{average.toFixed(1)} contributions</strong> per active day. {strongest ? <>Your strongest recorded day was <strong>{strongest.count} contributions</strong> on {formatDate(strongest.date)}.</> : 'No contribution days are available for this period.'}</div>
      <div className="apivue-insight-stats"><div><span>Current streak</span><strong>{streak} days</strong></div><div><span>Longest streak</span><strong>{longest} days</strong></div><div><span>Active days</span><strong>{active}</strong></div></div>
    </div>

    <div className="apivue-two-col">
      <div className="apivue-card"><div className="apivue-card-title"><Github className="h-3.5 w-3.5"/> Contribution breakdown</div>{hasTypeBreakdown ? <><div className="apivue-contrib-bar">{contributionTypes.map((item) => <div key={item.label} className={item.className} style={{ width: `${typeTotal ? item.value / typeTotal * 100 : 0}%` }}/>)}</div><div>{contributionTypes.map((item) => { const Icon = item.icon; return <div className="apivue-contrib-row" key={item.label}><span><i className={item.className}/><Icon className="h-3 w-3"/>{item.label}</span><code>{item.value.toLocaleString()}</code></div>; })}</div></> : <p className="apivue-muted-copy">GitHub's public contribution calendar does not expose a complete contribution-type breakdown for this lookup. APIVue leaves unavailable values unavailable instead of inventing them.</p>}</div>
      <div className="apivue-card"><div className="apivue-card-title"><Flame className="h-3.5 w-3.5"/> Activity range</div><div className="apivue-range-selector">{(Object.keys(RANGE_LABELS) as GitHubAnalyticsRange[]).map((item) => <button key={item} className={range === item ? 'active' : ''} onClick={() => setRange(item)}>{RANGE_LABELS[item]}</button>)}</div><p className="apivue-muted-copy">Every number above is calculated from the stored GitHub contribution days. Missing days remain zero; APIVue does not synthesize activity.</p></div>
    </div>
  </section>;
}
