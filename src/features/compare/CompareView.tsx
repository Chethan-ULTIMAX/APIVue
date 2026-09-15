import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Check, GitCompareArrows, Info, Search, Sparkles, Users, X, ArrowUpRight, Minus } from 'lucide-react';
import { useTrackedProfiles } from '@/hooks/use-profiles';
import { explorePublicProfile, type PublicDataResult, type PublicPlatform } from '@/lib/public-data';
import type { TrackedProfile } from '@/lib/integrations/registry';
import { formatNumber, numericMetrics, platformLabel, platformTone, sharedNumericMetrics } from '@/lib/analytics/dashboard-data';
import { getIntegration } from '@/lib/integrations/registry';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';

type CompareProfile = TrackedProfile & { source: 'connected' | 'explored' };

function publicToTracked(data: PublicDataResult): CompareProfile {
  return {
    id: `explored-${data.platform}-${data.profile.username}`,
    platform: data.platform,
    handle: data.profile.username,
    displayName: data.profile.displayName ?? data.profile.username,
    avatarUrl: data.profile.avatarUrl,
    profileUrl: data.profile.profileUrl,
    source: 'explored',
    lastSyncedAt: data.fetchedAt,
    data: {
      metrics: data.metrics.map((m) => ({
        key: m.label.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
        label: m.label,
        value: m.value,
      })),
      activity: data.activity.map((a) => ({ date: a.timestamp.slice(0, 10), count: 1 })),
      breakdowns: (data.breakdowns ?? []).map((b) => ({ key: b.label, label: b.label, items: b.items })),
    },
  };
}

function metric(profile: TrackedProfile, key: string): number | null {
  const item = profile.data?.metrics?.find((m) => m.key === key);
  return item && typeof item.value === 'number' ? item.value : null;
}

type CellValue = number | null;
type RowResult = {
  metric: string;
  key: string;
  values: Record<string, CellValue>;
  winner: string | null;
  allSame: boolean;
  anyAvailable: boolean;
};

function buildComparisonRow(
  m: { key: string; label: string },
  selected: CompareProfile[],
): RowResult {
  const values: Record<string, CellValue> = {};
  selected.forEach((p) => {
    values[p.id] = metric(p, m.key);
  });

  const available = selected
    .map((p) => ({ id: p.id, value: values[p.id] }))
    .filter((v): v is { id: string; value: number } => v.value !== null);

  const anyAvailable = available.length > 0;
  const allSame =
    available.length === selected.length &&
    available.every((v) => v.value === available[0].value);

  let winner: string | null = null;
  if (anyAvailable && !allSame && available.length >= 2) {
    const max = Math.max(...available.map((v) => v.value));
    const winners = available.filter((v) => v.value === max);
    if (winners.length === 1) winner = winners[0].id;
  }

  return { metric: m.label, key: m.key, values, winner, allSame, anyAvailable: anyAvailable };
}

export function CompareView() {
  const location = useLocation();
  const { data: connected = [], isLoading } = useTrackedProfiles();
  const incoming = (location.state as { exploreProfile?: PublicDataResult } | null)?.exploreProfile;
  const [explored, setExplored] = useState<CompareProfile[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [platform, setPlatform] = useState<PublicPlatform>('github');
  const [handle, setHandle] = useState('');
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!incoming) return;
    const p = publicToTracked(incoming);
    setExplored((c) => (c.some((x) => x.id === p.id) ? c : [...c, p]));
    setSelectedIds((c) => (c.includes(p.id) ? c : [...c, p.id]));
  }, [incoming]);

  const profiles = useMemo<CompareProfile[]>(
    () => [...connected.map((p) => ({ ...p, source: 'connected' as const })), ...explored],
    [connected, explored],
  );
  const selected = profiles.filter((p) => selectedIds.includes(p.id));
  const shared = sharedNumericMetrics(selected);
  const rows = shared.map((m) => buildComparisonRow(m, selected));

  const addPublic = async () => {
    if (!handle.trim()) return;
    setSearching(true);
    try {
      const data = await explorePublicProfile(platform, handle.trim());
      const p = publicToTracked(data);
      setExplored((c) => (c.some((x) => x.id === p.id) ? c : [...c, p]));
      setSelectedIds((c) => (c.includes(p.id) ? c : [...c, p.id]));
      setHandle('');
      toast({ title: 'Profile added', description: `${p.handle} is ready for comparison.` });
    } catch (e) {
      toast({
        title: 'Could not add profile',
        description: e instanceof Error ? e.message : 'Public lookup failed.',
        variant: 'destructive',
      });
    } finally {
      setSearching(false);
    }
  };

  const toggle = (id: string) =>
    setSelectedIds((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  if (isLoading)
    return (
      <div className="p-6">
        <div className="mx-auto max-w-7xl animate-pulse space-y-5">
          <div className="h-24 rounded-2xl bg-muted" />
          <div className="h-80 rounded-2xl bg-muted" />
        </div>
      </div>
    );

  return (
    <div className="relative min-h-full overflow-hidden">
      <div className="pointer-events-none absolute right-0 top-0 h-96 w-96 rounded-full bg-blue-500/[0.07] blur-3xl" />
      <div className="relative mx-auto max-w-7xl space-y-6 p-5 sm:p-6 lg:p-8">
        <header>
          <div className="mb-3 flex flex-wrap gap-2">
            <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <GitCompareArrows className="mr-1.5 h-3 w-3" />
              Comparison studio
            </Badge>
            <Badge variant="outline">{selected.length} selected</Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Compare profiles with context.
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            APIVue compares shared metrics when they exist, but keeps
            platform-specific evidence visible so GitHub, LeetCode and
            Codeforces never get flattened into meaningless numbers.
          </p>
        </header>

        <Card>
          <CardContent className="p-5">
            <div className="grid gap-3 lg:grid-cols-[auto_1fr_auto]">
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as PublicPlatform)}
                className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
              >
                <option value="github">GitHub</option>
                <option value="codeforces">Codeforces</option>
                <option value="leetcode">LeetCode</option>
                <option value="codewars">Codewars</option>
                <option value="stackoverflow">Stack Overflow</option>
              </select>
              <Input
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void addPublic();
                }}
                placeholder={platform === 'stackoverflow' ? 'Numeric user ID' : 'Username / handle'}
              />
              <Button onClick={() => void addPublic()} disabled={searching} className="gap-2">
                <Search className="h-4 w-4" />
                {searching ? 'Adding…' : 'Add public profile'}
              </Button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {profiles.map((p) => {
                const active = selectedIds.includes(p.id);
                const Icon = getIntegration(p.platform).icon;
                const tone = platformTone(p.platform);
                return (
                  <div key={p.id} className="flex items-center">
                    <button
                      type="button"
                      onClick={() => toggle(p.id)}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2 transition ${
                        active ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                      }`}
                    >
                      <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${tone.bg} ${tone.text}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="max-w-[170px] text-left">
                        <span className="block truncate text-xs font-semibold">
                          {p.displayName || p.handle}
                        </span>
                        <span className="block text-[10px] text-muted-foreground">
                          {platformLabel(p.platform)}
                        </span>
                      </span>
                      {active && <Check className="h-3.5 w-3.5 text-primary" />}
                    </button>
                    {p.source === 'explored' && (
                      <button
                        type="button"
                        onClick={() => {
                          setExplored((c) => c.filter((x) => x.id !== p.id));
                          setSelectedIds((c) => c.filter((x) => x !== p.id));
                        }}
                        className="ml-1 p-1 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {selected.length < 2 ? (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center">
              <Users className="mx-auto h-10 w-10 text-muted-foreground/40" />
              <h2 className="mt-4 text-lg font-semibold">
                Select at least two profiles
              </h2>
              <p className="mx-auto mt-1 max-w-lg text-sm text-muted-foreground">
                Once two sources are selected, APIVue builds a visual
                comparison report from their real returned data.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <section>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                01 · Profiles
              </p>
              <h2 className="mt-1 text-2xl font-bold">
                {selected.length} profiles in the same room
              </h2>
            </section>

            {/* Profile cards */}
            <div className="grid gap-4 lg:grid-cols-3">
              {selected.map((p) => {
                const tone = platformTone(p.platform);
                return (
                  <Card key={p.id} className="overflow-hidden transition hover:-translate-y-1 hover:shadow-lg">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className={`${tone.bg} ${tone.text}`}>
                          {platformLabel(p.platform)}
                        </Badge>
                        {p.profileUrl && (
                          <a
                            href={p.profileUrl}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="text-muted-foreground hover:text-primary"
                          >
                            <ArrowUpRight className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                      <h3 className="mt-3 truncate text-lg font-bold">
                        {p.displayName || p.handle}
                      </h3>
                      <p className="font-mono text-xs text-muted-foreground">
                        @{p.handle}
                      </p>
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        {numericMetrics(p).slice(0, 4).map((m) => (
                          <div key={m.key} className="rounded-xl bg-muted/40 p-3">
                            <p className="truncate text-[10px] text-muted-foreground">
                              {m.label}
                            </p>
                            <p className="mt-1 text-xl font-bold">
                              {formatNumber(m.value)}
                            </p>
                          </div>
                        ))}
                        {numericMetrics(p).length === 0 && (
                          <p className="col-span-2 text-[11px] text-muted-foreground">
                            No numeric metrics returned by this source.
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Shared metrics table */}
            {shared.length > 0 && (
              <>
                <Card>
                  <CardContent className="p-5 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          02 · Shared metrics
                        </p>
                        <h3 className="mt-1 font-semibold">
                          Directly comparable signals
                        </h3>
                      </div>
                      <Badge variant="secondary">{shared.length} shared</Badge>
                    </div>

                    <div className="mt-5 overflow-x-auto">
                      <table className="w-full min-w-[620px] text-sm">
                        <thead>
                          <tr className="border-b text-left text-xs text-muted-foreground">
                            <th className="px-3 py-3">Metric</th>
                            {selected.map((p) => (
                              <th key={p.id} className="px-3 py-3">
                                <span className="truncate">{p.handle}</span>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row) => (
                            <tr
                              key={row.key}
                              className="border-b border-border/60 last:border-0"
                            >
                              <td className="px-3 py-3 font-medium">
                                {row.metric}
                              </td>
                              {selected.map((p) => {
                                const val = row.values[p.id];
                                const isWinner = row.winner === p.id;
                                const isUnavailable = val === null;
                                return (
                                  <td
                                    key={p.id}
                                    className={`px-3 py-3 ${
                                      isUnavailable
                                        ? 'text-muted-foreground/50'
                                        : isWinner
                                          ? 'font-bold text-emerald-600 dark:text-emerald-400'
                                          : 'font-bold'
                                    }`}
                                  >
                                    {isUnavailable ? (
                                      <span className="flex items-center gap-1 text-xs font-normal italic">
                                        <Minus className="h-3 w-3" />
                                        Unavailable
                                      </span>
                                    ) : (
                                      formatNumber(val)
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-4 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        Higher value
                      </span>
                      <span className="flex items-center gap-1">
                        <Minus className="h-3 w-3" />
                        Data not returned by this source
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Visual comparison — only when data exists */}
                <Card>
                  <CardContent className="p-5 sm:p-6">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      03 · Visual comparison
                    </p>
                    <h3 className="mt-1 font-semibold">
                      Shared metric distribution
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Bars only appear for metrics that a source actually
                      returned. Missing data is never shown as zero.
                    </p>
                    <div className="mt-5 h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={rows.map((r) => ({
                            metric: r.metric,
                            ...Object.fromEntries(
                              selected.map((p) => [
                                p.id,
                                r.values[p.id] ?? null,
                              ]),
                            ),
                          }))}
                          layout="vertical"
                          margin={{ left: 20, right: 20 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="hsl(var(--border))"
                            horizontal={false}
                          />
                          <XAxis type="number" tick={{ fontSize: 10 }} />
                          <YAxis
                            type="category"
                            dataKey="metric"
                            width={120}
                            tick={{ fontSize: 10 }}
                          />
                          <Tooltip
                            contentStyle={{
                              borderRadius: 12,
                              border: '1px solid hsl(var(--border))',
                              background: 'hsl(var(--card))',
                            }}
                          />
                          <Legend />
                          {selected.map((p) => (
                            <Bar
                              key={p.id}
                              dataKey={p.id}
                              name={p.handle}
                              fill={platformTone(p.platform).chart}
                              radius={[0, 5, 5, 0]}
                            />
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Methodology explanation */}
            <Card className="border-border bg-card/70">
              <CardContent className="p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div className="space-y-2">
                    <p className="font-semibold">How APIVue compares</p>
                    <p className="text-sm leading-6 text-muted-foreground">
                      The table above only shows metrics that every selected
                      source actually returned. If a platform does not expose
                      a particular value, it is marked <strong>Unavailable</strong>
                      — never zero. The green highlight identifies the source
                      with the highest real value for that metric, but a higher
                      number does not mean a better developer.
                    </p>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {shared.length
                        ? `You have ${shared.length} metric${shared.length === 1 ? '' : 's'} that can be compared directly. The profile cards above preserve the platform-specific signals that a universal table cannot represent.`
                        : 'These sources expose different metrics, so APIVue keeps the comparison honest instead of showing an empty or fabricated chart. The platform cards above are the meaningful comparison.'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
