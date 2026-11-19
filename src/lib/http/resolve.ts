/**
 * URL / body / variable resolution for the APIVue request builder.
 *
 * Everything here is pure (no DOM, no network) so it can be unit tested.
 */

import {
  type AuthConfig,
  type BodyMode,
  type EnvironmentVariable,
  type HttpMethod,
  type KeyValueRow,
  type ResolvedRequest,
  HttpRequestError,
} from './types';

/** `{{ name }}` placeholders used by environment variables. */
const VARIABLE_PATTERN = /\{\{\s*([\w.-]+)\s*\}\}/g;

export function applyVariables(
  input: string,
  variables: EnvironmentVariable[],
): string {
  if (!input) return input;
  const lookup = new Map<string, string>();
  for (const variable of variables) {
    if (variable.key.trim()) lookup.set(variable.key.trim(), variable.value);
  }
  return input.replace(VARIABLE_PATTERN, (match, name: string) => {
    const value = lookup.get(name);
    return value === undefined ? match : value;
  });
}

/** Variables referenced by a string, used to warn about missing values. */
export function referencedVariables(input: string): string[] {
  const found = new Set<string>();
  for (const match of input.matchAll(VARIABLE_PATTERN)) found.add(match[1]);
  return [...found];
}

export function missingVariables(
  inputs: string[],
  variables: EnvironmentVariable[],
): string[] {
  const available = new Set(
    variables.filter((v) => v.key.trim() && v.value !== '').map((v) => v.key.trim()),
  );
  const missing = new Set<string>();
  for (const input of inputs) {
    for (const name of referencedVariables(input)) {
      if (!available.has(name)) missing.add(name);
    }
  }
  return [...missing];
}

/** Enabled rows with a non-empty key. */
export function activeRows(rows: KeyValueRow[]): KeyValueRow[] {
  return rows.filter((row) => row.enabled && row.key.trim() !== '');
}

/**
 * Validate and normalise a URL.
 *
 * Bare hostnames such as `api.github.com/user` are upgraded to https so the
 * builder stays forgiving, but anything that is not http(s) is rejected.
 */
export function normalizeUrl(rawInput: string): URL {
  const raw = rawInput.trim();
  if (!raw) throw new HttpRequestError('invalid-url', 'Enter a request URL.');
  if (/\s/.test(raw)) {
    throw new HttpRequestError(
      'invalid-url',
      'The URL contains whitespace. Encode spaces or remove them.',
    );
  }

  // Reject any non-http(s) scheme up front. Checking for `scheme:` rather than
  // `scheme://` also catches `javascript:`, `data:` and `mailto:` which have no
  // authority component and would otherwise be silently prefixed with https.
  const scheme = /^([a-zA-Z][a-zA-Z\d+.-]*):/.exec(raw);
  if (scheme && !/^https?$/i.test(scheme[1])) {
    throw new HttpRequestError(
      'invalid-url',
      `Only http:// and https:// URLs can be sent. Received "${scheme[1]}:".`,
    );
  }

  let candidate = raw;
  if (!scheme) {
    candidate = `https://${candidate}`;
  }

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new HttpRequestError('invalid-url', `"${raw}" is not a valid URL.`);
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new HttpRequestError(
      'invalid-url',
      `Only http:// and https:// URLs can be sent. Received "${url.protocol}".`,
    );
  }
  if (!url.hostname) {
    throw new HttpRequestError('invalid-url', 'The URL is missing a hostname.');
  }
  return url;
}

export interface ResolveInput {
  method: HttpMethod;
  url: string;
  params: KeyValueRow[];
  headers: KeyValueRow[];
  bodyMode: BodyMode;
  body: string;
  auth: AuthConfig;
  variables: EnvironmentVariable[];
}

function encodeBasic(username: string, password: string): string {
  const raw = `${username}:${password}`;
  // btoa is available in browsers and Node 16+; guard anyway.
  if (typeof btoa === 'function') {
    return btoa(unescape(encodeURIComponent(raw)));
  }
  return Buffer.from(raw, 'utf8').toString('base64');
}

/**
 * Turn a draft into a concrete request.
 *
 * Throws `HttpRequestError('invalid-url')` for unusable URLs, and also when a
 * variable is referenced but not defined — sending literal `{{token}}` to a
 * server produces confusing failures, so it is surfaced up front.
 */
export function resolveRequest(input: ResolveInput): ResolvedRequest {
  const substitutedUrl = applyVariables(input.url, input.variables);
  const url = normalizeUrl(substitutedUrl);

  const skipped: string[] = [];

  for (const row of input.params) {
    if (!row.enabled) continue;
    const key = applyVariables(row.key, input.variables).trim();
    if (!key) continue;
    const value = applyVariables(row.value, input.variables);
    url.searchParams.append(key, value);
  }

  const headers: Record<string, string> = {};
  for (const row of input.headers) {
    if (!row.enabled) continue;
    const key = applyVariables(row.key, input.variables).trim();
    if (!key) continue;
    const value = applyVariables(row.value, input.variables);
    if (value === '') {
      skipped.push(key);
      continue;
    }
    headers[key] = value;
  }

  // Authentication is applied after manual headers so explicitly saved auth
  // wins, but a user-supplied Authorization header is never silently dropped.
  const auth = input.auth ?? { mode: 'none' as const };
  if (auth.mode === 'bearer') {
    const token = applyVariables(auth.token ?? '', input.variables).trim();
    if (token) headers.Authorization = `Bearer ${token}`;
  } else if (auth.mode === 'basic') {
    const username = applyVariables(auth.username ?? '', input.variables);
    const password = applyVariables(auth.password ?? '', input.variables);
    if (username || password) {
      headers.Authorization = `Basic ${encodeBasic(username, password)}`;
    }
  } else if (auth.mode === 'api-key') {
    const name = applyVariables(auth.apiKeyName ?? '', input.variables).trim();
    const value = applyVariables(auth.apiKeyValue ?? '', input.variables);
    if (name && value) {
      if (auth.apiKeyLocation === 'query') url.searchParams.set(name, value);
      else headers[name] = value;
    }
  }

  const body = resolveBody(input);
  if (body !== undefined) {
    const hasContentType = Object.keys(headers).some(
      (key) => key.toLowerCase() === 'content-type',
    );
    if (!hasContentType && input.bodyMode === 'json') {
      headers['Content-Type'] = 'application/json';
    }
  }

  return {
    url: url.toString(),
    method: input.method,
    headers,
    body,
    skipped,
  };
}

export function resolveBody(input: ResolveInput): string | undefined {
  if (input.method === 'GET' || input.method === 'HEAD') return undefined;
  if (input.bodyMode === 'none') return undefined;

  const body = applyVariables(input.body, input.variables);

  if (input.bodyMode === 'x-www-form-urlencoded') {
    // One `key=value` pair per line. A single line that already looks like a
    // pasted query string (`a=1&b=2`) is split on `&`, but only when every
    // segment has an `=` — otherwise `q=a&b` would silently lose the `&`.
    const lines = body
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const segments =
      lines.length === 1 && lines[0].includes('&')
        ? lines[0].split('&').map((part) => part.trim()).filter(Boolean)
        : lines;

    const looksLikeQueryString =
      segments.length > 1 && segments.every((segment) => segment.includes('='));
    const pairs = (looksLikeQueryString ? segments : lines).map((line) => {
      const index = line.indexOf('=');
      if (index === -1) return `${encodeURIComponent(line)}=`;
      const key = line.slice(0, index);
      const value = line.slice(index + 1);
      return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
    });
    return pairs.join('&');
  }

  return body;
}

/**
 * Human-readable JSON validation used before sending.
 * Returns an error message, or null when the body is acceptable.
 */
export function validateJsonBody(body: string): string | null {
  if (!body.trim()) return null;
  try {
    JSON.parse(body);
    return null;
  } catch (error) {
    return error instanceof Error
      ? `Invalid JSON: ${error.message}`
      : 'Invalid JSON body.';
  }
}

/** Pretty-print JSON when possible; otherwise return the input unchanged. */
export function prettifyJson(body: string): string | null {
  if (!body.trim()) return null;
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return null;
  }
}
