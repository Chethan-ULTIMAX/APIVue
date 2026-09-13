import type { PublicDataResult, PublicPlatform } from './types';
import { getPublicPlatform } from './registry';

/** Public lookup cache keeps repeated Explore requests from hammering provider APIs. */
const CACHE_TTL_MS = 60_000;
const MAX_RETRIES = 2;

type CacheEntry = { expiresAt: number; value: PublicDataResult };
const cache = new Map<string, CacheEntry>();

export interface PublicLookupOptions {
  /** Bypass the short-lived browser cache and fetch fresh provider data. */
  forceRefresh?: boolean;
}

function cleanInput(platform: PublicPlatform, input: string): string {
  const value = input.trim().replace(/^@/, '');
  if (!value) throw new Error('Please enter a username or handle.');

  try {
    const url = new URL(value);
    const parts = url.pathname.split('/').filter(Boolean);
    if (platform === 'github' && parts[0]) return parts[0];
    if (platform === 'codeforces' && parts[0] === 'profile' && parts[1]) return parts[1];
    if (platform === 'leetcode' && (parts[0] === 'u' || parts[0] === 'profile') && parts[1]) return parts[1];
    if (platform === 'codewars' && parts[0] === 'users' && parts[1]) return parts[1];
    if (platform === 'stackoverflow' && parts[0] === 'users' && /^\d+$/.test(parts[1] ?? '')) return parts[1];
  } catch {
    // Plain usernames are expected and continue below.
  }

  return value.replace(/\/$/, '');
}

function isRetryable(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /\b(?:429|500|502|503|504)\b|rate limit|temporarily|try again later/i.test(message);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => globalThis.setTimeout(resolve, ms));
}

async function fetchWithRetry(fetcher: () => Promise<PublicDataResult>): Promise<PublicDataResult> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      return await fetcher();
    } catch (error) {
      lastError = error;
      if (attempt === MAX_RETRIES || !isRetryable(error)) throw error;
      await delay(350 * (attempt + 1));
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Public profile lookup failed.');
}

/**
 * Fetch and normalize one public profile across any supported platform.
 * The short cache is deliberately client-side and ephemeral; APIVue never
 * treats cached public data as ownership proof.
 */
export async function explorePublicProfile(
  platform: PublicPlatform,
  username: string,
  options: PublicLookupOptions = {},
): Promise<PublicDataResult> {
  const cleanUsername = cleanInput(platform, username);
  const cacheKey = `${platform}:${cleanUsername.toLowerCase()}`;
  const cached = cache.get(cacheKey);

  if (!options.forceRefresh && cached && cached.expiresAt > Date.now()) return cached.value;
  if (cached) cache.delete(cacheKey);

  const definition = getPublicPlatform(platform);
  const value = await fetchWithRetry(() => definition.fetch(cleanUsername));
  cache.set(cacheKey, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  return value;
}

/** Clear cached public lookups; useful after a manual refresh or in tests. */
export function clearPublicProfileCache(platform?: PublicPlatform, username?: string): void {
  if (!platform) {
    cache.clear();
    return;
  }
  if (!username) {
    for (const key of cache.keys()) if (key.startsWith(`${platform}:`)) cache.delete(key);
    return;
  }
  cache.delete(`${platform}:${cleanInput(platform, username).toLowerCase()}`);
}
