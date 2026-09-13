import { Router } from 'express';
import { requireSupabaseUser } from '../middleware/session';
import { getCodeforcesUserProfile } from '../integrations/codeforces';
import { getLeetCodeUserProfile } from '../integrations/leetcode';
import { getCodewarsUserProfile } from '../integrations/codewars';
import { getStackOverflowUserProfile } from '../integrations/stackoverflow';
import { getConnectedSecurityProfile } from '../integrations/security-public';
import { getCodeforcesConnection, getLeetCodeConnection, getCodewarsConnection, getStackOverflowConnection } from '../storage/connections';
import { supabaseAdmin } from '../supabase';

const router = Router();
type Provider = 'codeforces' | 'leetcode' | 'codewars' | 'stackoverflow' | 'tryhackme' | 'hackthebox';
type NormalizedProviderProfile = { platform: Provider; handle: string; displayName: string; avatarUrl: string | null; profileUrl: string; bio: string | null; location: string | null; joinedAt: string | null; metrics: Array<{ key: string; label: string; value: number | string | null; format?: string }>; breakdowns: Array<{ key: string; label: string; unit?: string; items: Array<{ label: string; value: number }> }>; ratingHistory: Array<{ date: string; value: number }>; activity: Array<{ date: string; count: number }>; highlights: Array<{ title: string; url?: string; subtitle?: string }>; fetchedAt: string; };
const lastSyncByUserProvider = new Map<string, number>();
const SYNC_COOLDOWN_MS = 15_000;
function isProvider(value: string): value is Provider { return ['codeforces', 'leetcode', 'codewars', 'stackoverflow', 'tryhackme', 'hackthebox'].includes(value); }
function toData(profile: NormalizedProviderProfile) { return { platform: profile.platform, handle: profile.handle, displayName: profile.displayName, avatarUrl: profile.avatarUrl, profileUrl: profile.profileUrl, bio: profile.bio, location: profile.location, joinedAt: profile.joinedAt, metrics: profile.metrics.filter(metric => metric.value !== null), breakdowns: profile.breakdowns, ratingHistory: profile.ratingHistory, activity: profile.activity, highlights: profile.highlights, fetchedAt: profile.fetchedAt }; }
function metricsRecord(profile: NormalizedProviderProfile): Record<string, number> { return Object.fromEntries(profile.metrics.filter(m => typeof m.value === 'number' && Number.isFinite(m.value)).map(m => [m.key, m.value as number])); }
async function getConnectedHandle(provider: Provider, userId: string): Promise<string | null> {
  switch (provider) {
    case 'codeforces': return (await getCodeforcesConnection('', userId))?.handle || null;
    case 'leetcode': return (await getLeetCodeConnection('', userId))?.handle || null;
    case 'codewars': return (await getCodewarsConnection('', userId))?.handle || null;
    case 'stackoverflow': return (await getStackOverflowConnection('', userId))?.handle || null;
    case 'tryhackme': case 'hackthebox': { const { data } = await supabaseAdmin.from('tracked_profiles').select('handle').eq('user_id', userId).eq('platform', provider).order('last_synced_at', { ascending: false }).limit(1).maybeSingle(); return data?.handle ?? null; }
  }
}
async function fetchProfile(provider: Provider, handle: string): Promise<NormalizedProviderProfile> {
  switch (provider) {
    case 'codeforces': return getCodeforcesUserProfile(handle);
    case 'leetcode': return getLeetCodeUserProfile(handle);
    case 'codewars': return getCodewarsUserProfile(handle);
    case 'stackoverflow': return getStackOverflowUserProfile(handle);
    case 'tryhackme': case 'hackthebox': return getConnectedSecurityProfile(provider, handle) as Promise<NormalizedProviderProfile>;
  }
}
router.post('/:provider/sync', async (req, res) => {
  const user = await requireSupabaseUser(req, res); if (!user) return;
  const provider = String(req.params.provider).toLowerCase(); if (!isProvider(provider)) { res.status(404).json({ ok: false, error: 'Unsupported provider.' }); return; }
  const syncKey = `${user.id}:${provider}`; const previousSync = lastSyncByUserProvider.get(syncKey) ?? 0; const elapsed = Date.now() - previousSync;
  if (elapsed < SYNC_COOLDOWN_MS) { res.status(429).json({ ok: false, error: `Please wait ${Math.ceil((SYNC_COOLDOWN_MS - elapsed) / 1000)}s before syncing ${provider} again.`, retryAfterSeconds: Math.ceil((SYNC_COOLDOWN_MS - elapsed) / 1000) }); return; }
  try {
    const handle = await getConnectedHandle(provider, user.id); if (!handle) { res.status(409).json({ ok: false, error: `${provider} is not connected. Connect or track the profile first.` }); return; }
    lastSyncByUserProvider.set(syncKey, Date.now()); const profile = await fetchProfile(provider, handle); const data = toData(profile); const syncedAt = new Date().toISOString();
    const { data: trackedProfile, error: trackedError } = await supabaseAdmin.from('tracked_profiles').upsert({ user_id: user.id, platform: provider, handle: profile.handle, display_name: profile.displayName, avatar_url: profile.avatarUrl, profile_url: profile.profileUrl, data, sync_error: null, last_synced_at: syncedAt }, { onConflict: 'user_id,platform,handle' }).select('*').single();
    if (trackedError || !trackedProfile) throw new Error(trackedError?.message ?? 'Unable to save tracked profile.');
    const { error: snapshotError } = await supabaseAdmin.from('profile_snapshots').insert({ profile_id: trackedProfile.id, user_id: user.id, captured_at: syncedAt, metrics: metricsRecord(profile) }); if (snapshotError) throw new Error(`Profile saved, but snapshot failed: ${snapshotError.message}`);
    const { error: accountError } = await supabaseAdmin.from('connected_accounts').update({ last_synced_at: syncedAt, username: profile.handle, display_name: profile.displayName, avatar_url: profile.avatarUrl, profile_url: profile.profileUrl }).eq('user_id', user.id).eq('provider', provider); if (accountError) console.warn(`[provider-sync] account timestamp update failed for ${provider}:`, accountError);
    res.status(200).json({ ok: true, provider, handle: profile.handle, syncedAt, profile: trackedProfile });
  } catch (error) { lastSyncByUserProvider.delete(syncKey); console.error(`[provider-sync] ${provider} sync failed:`, error); res.status(502).json({ ok: false, error: error instanceof Error ? error.message : `Unable to sync ${provider}.` }); }
});
export default router;
