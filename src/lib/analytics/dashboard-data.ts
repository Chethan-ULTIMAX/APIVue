import type { ProfileSnapshot, TrackedProfile } from '@/lib/integrations/registry';

export interface DashboardMetric {
  key: string;
  label: string;
  value: number;
  platform: string;
}

export interface ActivityPoint {
  date: string;
  count: number;
}

export function numericMetrics(profile: TrackedProfile): DashboardMetric[] {
  return (profile.data?.metrics ?? [])
    .filter((metric) => typeof metric.value === 'number' && Number.isFinite(metric.value))
    .map((metric) => ({
      key: metric.key,
      label: metric.label,
      value: Number(metric.value),
      platform: profile.platform,
    }));
}

export function profileMetric(profile: TrackedProfile, key: string) {
  return (profile.data?.metrics ?? []).find((metric) => metric.key === key);
}

export function allActivity(profiles: TrackedProfile[]): ActivityPoint[] {
  const byDay = new Map<string, number>();
  for (const profile of profiles) {
    for (const item of profile.data?.activity ?? []) {
      if (!item.date) continue;
      byDay.set(item.date, (byDay.get(item.date) ?? 0) + Math.max(0, Number(item.count) || 0));
    }
  }
  return Array.from(byDay, ([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date));
}

export function recentActivity(profiles: TrackedProfile[], limit = 8) {
  return profiles
    .flatMap((profile) =>
      (profile.data?.activity ?? []).map((item) => ({
        ...item,
        platform: profile.platform,
        handle: profile.handle,
        displayName: profile.displayName ?? profile.handle,
      })),
    )
    .filter((item) => item.date)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);
}

export function snapshotDelta(snapshots: ProfileSnapshot[], profileId: string, key: string) {
  const history = snapshots
    .filter((snapshot) => snapshot.profile_id === profileId && typeof snapshot.metrics?.[key] === 'number')
    .sort((a, b) => a.captured_at.localeCompare(b.captured_at));
  if (history.length < 2) return null;
  const first = Number(history[0].metrics[key]);
  const last = Number(history[history.length - 1].metrics[key]);
  if (!Number.isFinite(first) || !Number.isFinite(last)) return null;
  return { first, last, delta: last - first };
}

export function formatNumber(value: number) {
  return Number(value).toLocaleString();
}

export function formatRelativeDate(value: string) {
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return value;
  const diff = Date.now() - date.getTime();
  const days = Math.floor(diff / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function platformLabel(platform: string) {
  return platform === 'stackoverflow' ? 'Stack Overflow' : platform.charAt(0).toUpperCase() + platform.slice(1);
}
