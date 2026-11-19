/**
 * URL helpers shared by the auth flow.
 *
 * These are pure functions with no dependency on Supabase, React, or the auth
 * provider. They live in their own module so that code which only needs to
 * build or validate a redirect target — including tests — does not pull in the
 * Supabase client (which throws at import time when the environment is not
 * configured) or the React provider.
 *
 * The auth context re-exports both, so existing imports keep working.
 */

/**
 * Accept an in-app path, reject anything that could navigate off-site.
 *
 * Guards against open-redirect abuse: `//evil.test` and `https://evil.test`
 * both fall back, because a protocol-relative URL would otherwise be treated
 * as same-origin by the browser.
 */
export function safeRedirectPath(
  path: string | undefined,
  fallback = '/dashboard',
): string {
  return path && /^\/(?!\/)/.test(path) ? path : fallback;
}

/** Build an absolute URL that includes Vite's deployment base path. */
export function appUrl(path: string): string {
  const base = import.meta.env.BASE_URL || '/';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  const normalizedPath = path.replace(/^\/+/, '');
  return new URL(`${normalizedBase}${normalizedPath}`, window.location.origin).toString();
}
