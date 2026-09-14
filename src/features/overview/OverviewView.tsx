import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Code2,
  Database,
  ExternalLink,
  Plus,
  RefreshCw,
  Shield,
  Sparkles,
  Target,
} from 'lucide-react';

import { useProfileSnapshots, useTrackedProfiles } from '@/hooks/use-profiles';
import { useAuth } from '@/lib/auth-context';
import {
  allActivity,
  formatNumber,
  formatRelativeDate,
  numericMetrics,
  platformLabel,
  platformTone,
  recentActivity,
  snapshotDelta,
} from '@/lib/analytics/dashboard-data';
import { getIntegration, integrations, type TrackedProfile, type ProfileSnapshot } from '@/lib/integrations/registry';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TimeRangeChart } from '@/components/analytics/TimeRangeChart';
import { CountUp } from '@/components/apivue/CountUp';
import { APIVueSignature } from '@/components/apivue/APIVueSignature';
import { ProfileAvatar } from '@/components/apivue/ProfileBits';

/* ============================================================
 * Category groups — aligned to real integration IDs only.
 * ============================================================ */

const groups = [
  { id: 'development', query: 'development', title: 'Development', description: 'Code, repositories, contributions and developer activity.', icon: Code2, tone: 'blue', platforms: ['github', 'stackoverflow'] as const },
  { id: 'dsa', query: 'dsa', title: 'DSA / CP', description: 'Problems, contests, ratings and coding practice.', icon: BarChart3, tone: 'orange', platforms: ['codeforces', 'leetcode', 'codewars'] as const },
  { id: 'security', query: 'security', title: 'Cybersecurity', description: 'Security labs, CTFs and security practice from connected sources.', icon: Shield, tone: 'emerald', platforms: ['tryhackme', 'hackthebox'] as const },
  { id: 'learning', query: 'learning', title: 'Learning', description: 'Learning-oriented progress and activity.', icon: Sparkles, tone: 'cyan', platforms: ['leetcode', 'codewars', 'tryhackme'] as const },
  { id: 'activity', query: 'activity', title: 'Activity', description: 'General activity and consistency across all connected platforms.', icon: Target, tone: 'violet', platforms: ['github', 'codeforces', 'leetcode', 'codewars', 'stackoverflow', 'tryhackme', 'hackthebox'] as const },
] as const;

const toneClasses: Record<string, string> = {
  blue: 'border-blue-500/25 bg-blue-500/[0.06] text-blue-600 dark:text-blue-400',
  orange: 'border-orange-500/25 bg-orange-500/[0.06] text-orange-600 dark:text-orange-400',
  emerald: 'border-emerald-500/25 bg-emerald-500/[0.06] text-emerald-600 dark:text-emerald-400',
  violet: 'border-violet-500/25 bg-violet-500/[0.06] text-violet-600 dark:text-violet-400',
  cyan: 'border-cyan-500/25 bg-cyan-500/[0.06] text-cyan-600 dark:text-cyan-400',
};

function categoryProfiles(profiles: TrackedProfile[], ids: readonly string[]) {
  return profiles.filter((p) => ids.includes(p.platform));
}

function categoryActivity(profiles: TrackedProfile[], ids: readonly string[]) {
  const map = new Map<string, number>();
  for (const profile of categoryProfiles(profiles, ids))
    for (const point of profile.data?.activity ?? [])
      if (point.date)
        map.set(point.date, (map.get(point.date) ?? 0) + Math.max(0, Number(point.count) || 0));
  return Array.from(map, ([date, count]) => ({ date, count })).sort((a, b) =>
    a.date.localeCompare(b.date),
  );
}

/* ============================================================
 * Developer identity header
 * ============================================================ */

function DeveloperIdentityHeader({
  profiles,
  user,
}: {
  profiles: TrackedProfile[];
  user: { email: string; name?: string } | null;
}) {
  const primary = profiles[0];
  const connectedPlatforms = Array.from(
    new Set(profiles.map((p) => p.platform)),
  );
  const verifiedCount = profiles.filter(
    (p) => p.data?.ownershipVerified || p.data?.dataSource === 'oauth',
  ).length;
  const publicCount = profiles.length - verifiedCount;
  const lastSync = profiles
    .map((p) => p.lastSyncedAt ?? p.last_synced_at)
    .filter(Boolean)
    .sort()
    .at(-1);

  const displayName =
    primary?.displayName ??
    primary?.display_name ??
    user?.name ??
    user?.email?.split('@')[0] ??
    'Developer';

  const bio = primary?.data?.bio;
  const location = primary?.data?.location;

  return (
    <Card className="overflow-hidden border-border bg-card/80">
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          {/* Avatar */}
          <div className="flex shrink-0 flex-col items-center gap-2">
            {primary ? (
              <ProfileAvatar profile={primary} size="lg" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 font-semibold text-primary">
                {displayName.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>

          {/* Identity */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight">
                {displayName}
              </h1>
              {primary?.profileUrl && (
                <a
                  href={primary.profileUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-muted-foreground hover:text-primary"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>

            {bio && (
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                {bio}
              </p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {connectedPlatforms.map((platformId) => {
                const integration = getIntegration(platformId);
                const Icon = integration.icon;
                const profile = profiles.find((p) => p.platform === platformId);
                const isVerified =
                  profile?.data?.ownershipVerified ||
                  profile?.data?.dataSource === 'oauth';
                return (
                  <Badge
                    key={platformId}
                    variant="outline"
                    className="gap-1.5"
                  >
                    <Icon
                      className="h-3 w-3"
                      style={{ color: integration.accent }}
                    />
                    {integration.name}
                    {isVerified ? (
                      <Shield className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <span className="text-[9px] text-muted-foreground">
                        public
                      </span>
                    )}
                  </Badge>
                );
              })}
              {!connectedPlatforms.length && (
                <Badge variant="outline" className="text-muted-foreground">
                  No platforms connected
                </Badge>
              )}
            </div>

            {/* Sync status */}
            <div className="mt-4 flex flex-wrap gap-4 text-[11px] text-muted-foreground">
              {lastSync && (
                <span className="flex items-center gap-1">
                  <RefreshCw className="h-3 w-3" />
                  Last synced {formatRelativeDate(lastSync)}
                </span>
              )}
              {verifiedCount > 0 && (
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <Shield className="h-3 w-3" />
                  {verifiedCount} verified
                </span>
              )}
              {publicCount > 0 && (
                <span className="flex items-center gap-1">
                  <Database className="h-3 w-3" />
                  {publicCount} public
                </span>
              )}
              {location && (
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" />
                  {location}
                </span>
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex shrink-0 gap-2">
            <Link to="/dashboard/integrations">
              <Button size="sm" variant="outline" className="gap-2">
                <Plus className="h-3.5 w-3.5" />
                Connect
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ============================================================
 * Key metric card with count-up
 * ============================================================ */

function KeyMetricCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number | null;
  icon: React.ElementType;
  tone: string;
}) {
  return (
    <Card className="overflow-hidden bg-card/80 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-xl border ${tone}`}
          >
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <p className="mt-3 text-2xl font-black tabular-nums sm:text-3xl">
           {value === null ? '—' : <CountUp value={value} />}
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

/* ============================================================
 * Platform contribution overview row
 * ============================================================ */

function PlatformOverviewRow({
  profile,
  snapshots,
}: {
  profile: TrackedProfile;
  snapshots: ProfileSnapshot[];
}) {
  const integration = getIntegration(profile.platform);
  const Icon = integration.icon;
  const tone = platformTone(profile.platform);
  const metrics = numericMetrics(profile);
  const main = metrics[0];
  const delta = main ? snapshotDelta(snapshots, profile.id, main.key) : null;
  const isVerified =
    profile.data?.ownershipVerified || profile.data?.dataSource === 'oauth';
  const lastSync = profile.lastSyncedAt ?? profile.last_synced_at;
  const hasError = profile.syncError ?? profile.sync_error;

  return (
    <Link to={`/dashboard/profile/${profile.id}`}>
      <Card className="group h-full overflow-hidden bg-card/60 transition hover:-translate-y-0.5 hover:shadow-md">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-lg ${tone.bg} ${tone.text}`}
              >
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold">
                  {integration.name}
                </p>
                <p className="truncate text-[10px] text-muted-foreground">
                  @{profile.handle}
                </p>
              </div>
            </div>
            <Badge
              variant="outline"
              className={
                isVerified
                  ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                  : 'text-muted-foreground'
              }
            >
              {isVerified ? 'Verified' : 'Public'}
            </Badge>
          </div>

          {/* Metrics */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            {metrics.slice(0, 4).map((m) => (
              <div key={m.key} className="rounded-lg bg-muted/40 px-2.5 py-1.5">
                <p className="truncate text-[9px] text-muted-foreground">
                  {m.label}
                </p>
                <p className="text-sm font-bold tabular-nums">
                  {formatNumber(m.value)}
                </p>
              </div>
            ))}
            {metrics.length === 0 && (
              <p className="col-span-2 text-[11px] text-muted-foreground">
                No numeric metrics returned
              </p>
            )}
          </div>

          {/* Status footer */}
          <div className="mt-3 flex items-center justify-between border-t border-border pt-2 text-[10px] text-muted-foreground">
            <span>
              {hasError
                ? 'Sync error'
                : lastSync
                  ? formatRelativeDate(lastSync)
                  : 'Not synced'}
            </span>
            {delta && (
              <span
                className={
                  delta.delta >= 0
                    ? 'text-emerald-500'
                    : 'text-rose-500'
                }
              >
                {delta.delta >= 0 ? '+' : ''}
                {formatNumber(delta.delta)}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

/* ============================================================
 * Recent activity item
 * ============================================================ */

function RecentActivityItem({
  item,
}: {
  item: ReturnType<typeof recentActivity>[number];
}) {
  const integration = getIntegration(item.platform);
  const Icon = integration.icon;
  const tone = platformTone(item.platform);

  return (
    <Link
      to={`/dashboard/profile/${item.platform}`}
      className="flex items-center gap-3 rounded-xl border border-border bg-card/40 px-3 py-2.5 transition hover:border-primary/30 hover:bg-card/70"
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tone.bg} ${tone.text}`}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium">
          {item.displayName} on {integration.name}
        </p>
        <p className="text-[10px] text-muted-foreground">
          {formatRelativeDate(item.date)}
          {item.label ? ` · ${item.label}` : ''}
        </p>
      </div>
      <span className="shrink-0 text-xs font-bold tabular-nums text-muted-foreground">
        +{item.count}
      </span>
    </Link>
  );
}

/* ============================================================
 * Category card
 * ============================================================ */

function CategoryCard({
  group,
  profiles,
}: {
  group: (typeof groups)[number];
  profiles: TrackedProfile[];
}) {
  const sourceProfiles = categoryProfiles(profiles, group.platforms);
  const activity = categoryActivity(profiles, group.platforms);
  const total = activity.reduce((sum, point) => sum + point.count, 0);
  const metrics = sourceProfiles.reduce(
    (sum, profile) => sum + numericMetrics(profile).length,
    0,
  );
  const highlights = sourceProfiles
    .flatMap((profile) =>
      numericMetrics(profile)
        .slice(0, 2)
        .map((metric) => `${metric.label}: ${formatNumber(metric.value)}`),
    )
    .slice(0, 3);
  const Icon = group.icon;

  return (
    <Link to={`/dashboard/integrations?category=${group.query}`} className="group block h-full">
      <Card className="h-full overflow-hidden bg-card/80 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl">
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${toneClasses[group.tone]}`}>
              <Icon className="h-5 w-5" />
            </div>
            <Badge
              variant="outline"
              className={
                sourceProfiles.length
                  ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                  : ''
              }
            >
              {sourceProfiles.length
                ? `${sourceProfiles.length} connected`
                : 'Connect'}
            </Badge>
          </div>
          <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {group.title}
          </p>
          <h3 className="mt-1 text-2xl font-bold">
             {sourceProfiles.length ? formatNumber(total) : '—'}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {sourceProfiles.length ? 'returned activity' : 'connected sources'}
          </p>
          <p className="mt-3 min-h-10 text-xs leading-5 text-muted-foreground">
            {group.description}
          </p>
          <div className="mt-4 border-t border-border pt-4">
            {highlights.length
              ? highlights.map((item) => (
                  <p
                    key={item}
                    className="truncate text-[11px] text-muted-foreground"
                  >
                    {item}
                  </p>
                ))
              : (
                <p className="text-[11px] text-muted-foreground">
                  Connect a supported source to populate this area.
                </p>
              )}
          </div>
          <div className="mt-4 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{metrics} numeric metrics</span>
            <span className="font-medium text-primary">
              Open <ArrowRight className="ml-1 inline h-3 w-3" />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

/* ============================================================
 * Profile stat card
 * ============================================================ */

function ProfileStatCard({
  profile,
  snapshots,
}: {
  profile: TrackedProfile;
  snapshots: ProfileSnapshot[];
}) {
  const metrics = numericMetrics(profile).slice(0, 3);
  const main = metrics[0];
  const delta = main ? snapshotDelta(snapshots, profile.id, main.key) : null;
  const tone = platformTone(profile.platform);

  return (
    <Link to={`/dashboard/profile/${profile.id}`}>
      <Card className="group h-full overflow-hidden bg-card/80 transition hover:-translate-y-1 hover:shadow-lg">
        <CardContent className="p-5">
          <div className="flex items-center justify-between gap-2">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone.bg} ${tone.text}`}
            >
              <span className="text-sm font-black">
                {platformLabel(profile.platform).slice(0, 1)}
              </span>
            </div>
            <Badge variant="outline">{platformLabel(profile.platform)}</Badge>
          </div>
          <p className="mt-4 truncate text-xs text-muted-foreground">
            {profile.displayName || profile.handle}
          </p>
          <p className="truncate text-sm font-semibold">@{profile.handle}</p>
          {main ? (
            <>
              <p className="mt-4 text-3xl font-black tabular-nums">
                <CountUp value={main.value} />
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{main.label}</p>
            </>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              Public profile data
            </p>
          )}
          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border pt-4">
            {metrics.slice(1).map((metric) => (
              <div key={metric.key}>
                <p className="text-sm font-bold tabular-nums">
                  {formatNumber(metric.value)}
                </p>
                <p className="truncate text-[10px] text-muted-foreground">
                  {metric.label}
                </p>
              </div>
            ))}
            {delta && (
              <div className="text-right">
                <p
                  className={`text-sm font-bold tabular-nums ${
                    delta.delta >= 0 ? 'text-emerald-500' : 'text-rose-500'
                  }`}
                >
                  {delta.delta >= 0 ? '+' : ''}
                  {formatNumber(delta.delta)}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  since first snapshot
                </p>
              </div>
            )}
            {profile.lastSyncedAt && !delta && (
              <div className="text-right">
                <p className="text-sm font-medium">
                  {formatRelativeDate(profile.lastSyncedAt)}
                </p>
                <p className="text-[10px] text-muted-foreground">last synced</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

/* ============================================================
 * Main view
 * ============================================================ */

export function OverviewView() {
  const { user } = useAuth();
  const { data: profiles = [], isLoading, refetch } = useTrackedProfiles();
  const { data: snapshots = [] } = useProfileSnapshots();

  const activity = useMemo(() => allActivity(profiles), [profiles]);
  const total = activity.reduce((sum, point) => sum + point.count, 0);
  const metrics = profiles.reduce(
    (sum, profile) => sum + numericMetrics(profile).length,
    0,
  );
  const recent = useMemo(() => recentActivity(profiles, 6), [profiles]);
  const activePlatforms = Array.from(
    new Set(profiles.map((p) => p.platform)),
  );

  // Key metrics from real data
  const githubProfiles = profiles.filter((p) => p.platform === 'github');
  const totalRepos = githubProfiles.reduce<number | null>((sum, p) => {
      const repoMetric = numericMetrics(p).find((m) => m.key === 'public_repos' || m.key === 'repository_total');
      if (!repoMetric) return sum;
      return (sum ?? 0) + repoMetric.value;
    }, null);
  const totalFollowers = githubProfiles.reduce<number | null>((sum, p) => {
      const followersMetric = numericMetrics(p).find((m) => m.key === 'followers');
      if (!followersMetric) return sum;
      return (sum ?? 0) + followersMetric.value;
    }, null);
  const practiceProfiles = profiles.filter((p) => ['leetcode', 'codewars'].includes(p.platform));
  const totalProblemsSolved = practiceProfiles.reduce<number | null>((sum, p) => {
      const solved = numericMetrics(p).find(
        (m) => m.key === 'solved_all' || m.key === 'total_completed',
      );
      if (!solved) return sum;
      return (sum ?? 0) + solved.value;
    }, null);
  const stackOverflowProfiles = profiles.filter((p) => p.platform === 'stackoverflow');
  const totalReputation = stackOverflowProfiles.reduce<number | null>((sum, p) => {
      const rep = numericMetrics(p).find((m) => m.key === 'reputation');
      if (!rep) return sum;
      return (sum ?? 0) + rep.value;
    }, null);

  if (isLoading)
    return (
      <div className="p-6">
        <div className="mx-auto max-w-7xl animate-pulse space-y-6">
          <div className="h-32 rounded-3xl bg-muted" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 rounded-3xl bg-muted" />
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-64 rounded-3xl bg-muted" />
            ))}
          </div>
        </div>
      </div>
    );

  return (
    <div className="relative min-h-full overflow-hidden">
      <div className="pointer-events-none absolute -left-40 top-0 h-96 w-96 rounded-full bg-primary/[0.06] blur-3xl" />
      <div className="relative mx-auto max-w-7xl space-y-7 p-5 sm:p-6 lg:p-8">
        {/* Developer identity header */}
        <DeveloperIdentityHeader profiles={profiles} user={user} />

        {/* APIVue signature visual */}
        <APIVueSignature activePlatforms={activePlatforms} />

        {/* Key metrics */}
        {profiles.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KeyMetricCard
              label="Total activity"
              value={total}
              icon={Activity}
              tone={toneClasses.blue}
            />
            <KeyMetricCard
              label="Repositories"
              value={totalRepos}
              icon={Code2}
              tone={toneClasses.violet}
            />
            <KeyMetricCard
              label="Problems solved"
              value={totalProblemsSolved}
              icon={Target}
              tone={toneClasses.orange}
            />
            <KeyMetricCard
              label="Followers + Reputation"
              value={totalFollowers === null && totalReputation === null ? null : (totalFollowers ?? 0) + (totalReputation ?? 0)}
              icon={Sparkles}
              tone={toneClasses.emerald}
            />
          </div>
        )}

        {/* Real data banner */}
        <Card className="border-emerald-500/20 bg-emerald-500/[0.03]">
          <CardContent className="p-5 sm:p-6">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                <div>
                  <p className="font-semibold">Real connected data</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {profiles.length} source{profiles.length === 1 ? '' : 's'} ·{' '}
                    {metrics} numeric metrics · {formatNumber(total)} returned
                    activity count. Nothing is fabricated.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Link to="/dashboard/integrations">
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Manage connections
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetch()}
                  className="gap-2"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Refresh
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Category areas */}
        <section>
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Your areas
            </p>
            <h2 className="mt-1 text-xl font-bold">
              Every category opens directly into its filtered integrations.
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => (
              <CategoryCard key={group.id} group={group} profiles={profiles} />
            ))}
          </div>
        </section>

        {profiles.length > 0 && (
          <>
            {/* Platform contribution overview */}
            <section>
              <div className="mb-4 flex items-end justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Platform contribution overview
                  </p>
                  <h2 className="mt-1 text-xl font-bold">
                    Connected sources and their health
                  </h2>
                </div>
                <Link
                  to="/dashboard/profiles"
                  className="text-xs font-medium text-primary"
                >
                  View profiles{' '}
                  <ArrowRight className="ml-1 inline h-3 w-3" />
                </Link>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {profiles.map((profile) => (
                  <PlatformOverviewRow
                    key={profile.id}
                    profile={profile}
                    snapshots={snapshots}
                  />
                ))}
              </div>
            </section>

            {/* Activity chart */}
            <TimeRangeChart
              points={activity}
              title="Overall activity"
              subtitle="All connected sources normalized by day. The same 7-day, 30-day, 1-year and all-time controls are used everywhere."
            />

            {/* Recent activity */}
            {recent.length > 0 && (
              <section>
                <div className="mb-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Recent activity
                  </p>
                  <h2 className="mt-1 text-xl font-bold">
                    Latest events from your connected sources
                  </h2>
                </div>
                <div className="grid gap-2">
                  {recent.map((item, i) => (
                    <RecentActivityItem key={`${item.platform}-${item.date}-${i}`} item={item} />
                  ))}
                </div>
              </section>
            )}

            {/* Profile stat cards */}
            <section>
              <div className="mb-4 flex items-end justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Connected sources
                  </p>
                  <h2 className="mt-1 text-xl font-bold">Platform snapshots</h2>
                </div>
                <Link
                  to="/dashboard/profiles"
                  className="text-xs font-medium text-primary"
                >
                  View profiles{' '}
                  <ArrowRight className="ml-1 inline h-3 w-3" />
                </Link>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {profiles.map((profile) => (
                  <ProfileStatCard
                    key={profile.id}
                    profile={profile}
                    snapshots={snapshots}
                  />
                ))}
              </div>
            </section>
          </>
        )}

        {!profiles.length && (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center">
              <Database className="mx-auto h-10 w-10 text-muted-foreground/40" />
              <h2 className="mt-3 text-lg font-bold">
                Your dashboard is waiting for its first source
              </h2>
              <p className="mx-auto mt-1 max-w-lg text-sm text-muted-foreground">
                Connect a platform and APIVue will populate this page with real
                returned data.
              </p>
              <Link to="/dashboard/integrations">
                <Button className="mt-4">
                  Connect a platform{' '}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
