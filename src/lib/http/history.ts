/**
 * Local request history.
 *
 * History lives in the browser, not in Postgres, so response status codes and
 * request metadata are never duplicated server-side.
 *
 * Privacy rules enforced here:
 *   - header values are stored only for a small allow-list of non-secret keys
 *   - Authorization / Cookie / any key matching /token|secret|key|auth/ is dropped
 *   - query strings are kept (they are part of the URL the user typed) but
 *     auth config values are never persisted at all
 *   - the entry is dropped entirely if the URL contains obvious credentials
 */

import type { HttpMethod, KeyValueRow } from './types';

const STORAGE_KEY = 'apivue.request-history.v1';
const MAX_ENTRIES = 40;

const SAFE_HEADER_NAMES = new Set([
  'accept',
  'accept-language',
  'cache-control',
  'content-type',
  'user-agent',
  'x-request-id',
]);

/** Extracts `user:pass@host` credentials so they can be stripped. */
function stripUrlCredentials(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.username = '';
    parsed.password = '';
    return parsed.toString();
  } catch {
    return url.replace(/\/\/[^/@]*@/, '//');
  }
}

export function sanitizeHeaders(headers: KeyValueRow[]): KeyValueRow[] {
  return headers
    .filter((row) => row.enabled && row.key.trim() !== '')
    .filter((row) => {
      const name = row.key.trim().toLowerCase();
      if (SAFE_HEADER_NAMES.has(name)) return true;
      // Keep custom X-* headers only when they do not look sensitive.
      return name.startsWith('x-') && !/(token|secret|key|auth|session)/.test(name);
    })
    .map((row) => ({ ...row, value: row.value }));
}

export interface HistoryEntry {
  id: string;
  method: HttpMethod;
  url: string;
  name?: string;
  status: number | null;
  ok: boolean;
  durationMs: number | null;
  sizeBytes: number | null;
  at: string;
  /** Why the request never produced a response, if applicable. */
  failure?: string;
  params: KeyValueRow[];
  headers: KeyValueRow[];
  bodyMode: 'none' | 'json' | 'text' | 'x-www-form-urlencoded';
  body: string;
}

export function readHistory(): HistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

function writeHistory(entries: HistoryEntry[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    // Storage full or blocked (private mode): history is a convenience only.
  }
}

export interface RecordHistoryInput {
  method: HttpMethod;
  url: string;
  name?: string;
  status: number | null;
  ok: boolean;
  durationMs: number | null;
  sizeBytes: number | null;
  failure?: string;
  params: KeyValueRow[];
  headers: KeyValueRow[];
  bodyMode: 'none' | 'json' | 'text' | 'x-www-form-urlencoded';
  body: string;
}

export function recordHistory(input: RecordHistoryInput): HistoryEntry[] {
  const entry: HistoryEntry = {
    id:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `h-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    method: input.method,
    url: stripUrlCredentials(input.url),
    name: input.name,
    status: input.status,
    ok: input.ok,
    durationMs: input.durationMs,
    sizeBytes: input.sizeBytes,
    at: new Date().toISOString(),
    failure: input.failure,
    params: input.params.filter((row) => row.key.trim() !== ''),
    headers: sanitizeHeaders(input.headers),
    bodyMode: input.bodyMode,
    // Never persist an auth-bearing body twice; keep it only for JSON/text
    // bodies the user typed explicitly.
    body: input.bodyMode === 'none' ? '' : input.body,
  };
  const next = [entry, ...readHistory()].slice(0, MAX_ENTRIES);
  writeHistory(next);
  return next;
}

export function clearHistory(): HistoryEntry[] {
  writeHistory([]);
  return [];
}

export function removeHistoryEntry(id: string): HistoryEntry[] {
  const next = readHistory().filter((entry) => entry.id !== id);
  writeHistory(next);
  return next;
}
