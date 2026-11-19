import { describe, expect, it } from 'vitest';

import {
  describeFetchFailure,
  formatBytes,
  formatDuration,
  sendRequest,
  shellQuote,
  statusTextFor,
  summarizeUrl,
  toCurl,
} from '@/lib/http/execute';
import type { ResolveInput } from '@/lib/http/resolve';

/**
 * These tests run against the local mock API in `scripts/mock-api.mjs`
 * (port 8788). They only execute when MOCK_API_BASE is provided so that a
 * plain `npm test` never performs network I/O:
 *
 *   node scripts/mock-api.mjs &
 *   MOCK_API_BASE=http://127.0.0.1:8788 npm test
 */
const BASE = process.env.MOCK_API_BASE;
const maybe = BASE ? describe : describe.skip;

function input(overrides: Partial<ResolveInput> = {}): ResolveInput {
  return {
    method: 'GET',
    url: `${BASE}/json`,
    params: [],
    headers: [],
    bodyMode: 'none',
    body: '',
    auth: { mode: 'none' },
    variables: [],
    ...overrides,
  };
}

maybe('live request execution', () => {
  it('performs a GET and reports status, timing and size', async () => {
    const result = await sendRequest(input());
    expect(result.error).toBeNull();
    expect(result.response?.status).toBe(200);
    expect(result.response?.ok).toBe(true);
    expect(result.response?.isJson).toBe(true);
    expect(result.response?.sizeBytes).toBeGreaterThan(0);
    expect(typeof result.response?.durationMs).toBe('number');
  });

  it('sends query parameters', async () => {
    const result = await sendRequest(
      input({
        params: [
          { id: '1', key: 'page', value: '3', enabled: true },
          { id: '2', key: 'sort', value: 'desc', enabled: true },
        ],
      }),
    );
    const body = result.response?.json as { query: Record<string, string> };
    expect(body.query).toMatchObject({ page: '3', sort: 'desc' });
  });

  it('sends custom headers', async () => {
    const result = await sendRequest(
      input({ headers: [{ id: '1', key: 'X-Custom', value: 'hello', enabled: true }] }),
    );
    const body = result.response?.json as { headers: Record<string, string | null> };
    expect(body.headers['x-custom']).toBe('hello');
  });

  it('sends a JSON POST body with the right content type', async () => {
    const result = await sendRequest(
      input({
        method: 'POST',
        url: `${BASE}/echo`,
        bodyMode: 'json',
        body: '{"name":"APIVue"}',
      }),
    );
    expect(result.response?.status).toBe(201);
    const body = result.response?.json as {
      received: { name: string };
      id: string;
    };
    expect(body.received.name).toBe('APIVue');
  });

  it('parses a plain-text response without pretending it is JSON', async () => {
    const result = await sendRequest(input({ url: `${BASE}/text` }));
    expect(result.response?.isJson).toBe(false);
    expect(result.response?.bodyText).toContain('plain text response body');
    expect(result.response?.contentType).toContain('text/plain');
  });

  it('exposes the response headers the server allows', async () => {
    const result = await sendRequest(input());
    const keys = (result.response?.headers ?? []).map(([key]) => key.toLowerCase());
    expect(keys).toContain('content-type');
  });

  it('reports a 404 as an http error, not a transport failure', async () => {
    const result = await sendRequest(input({ url: `${BASE}/error` }));
    expect(result.error).toBeNull();
    expect(result.response?.status).toBe(404);
    expect(result.httpError).toBe(true);
    expect(result.response?.ok).toBe(false);
  });

  it('handles an empty 204 body', async () => {
    const result = await sendRequest(input({ url: `${BASE}/empty` }));
    expect(result.response?.status).toBe(204);
    expect(result.response?.bodyText).toBe('');
    expect(result.response?.isJson).toBe(false);
  });

  it('supports DELETE and OPTIONS methods', async () => {
    const del = await sendRequest(input({ method: 'DELETE' }));
    expect(del.response?.status).toBe(200);
    const options = await sendRequest(input({ method: 'OPTIONS' }));
    expect(options.error).toBeNull();
  });

  it('returns an invalid-url error without touching the network', async () => {
    const result = await sendRequest(input({ url: 'not a url at all' }));
    expect(result.response).toBeNull();
    expect(result.error?.kind).toBe('invalid-url');
  });

  it('returns a timeout error', async () => {
    const result = await sendRequest(input({ url: `${BASE}/slow` }), { timeoutMs: 150 });
    expect(result.response).toBeNull();
    expect(result.error?.kind).toBe('timeout');
  });

  it('can be cancelled', async () => {
    const controller = new AbortController();
    const promise = sendRequest(input({ url: `${BASE}/slow` }), {
      signal: controller.signal,
      timeoutMs: 5000,
    });
    setTimeout(() => controller.abort(), 50);
    const result = await promise;
    expect(result.error?.kind).toBe('aborted');
  });

  it('surfaces a network failure for an unreachable host', async () => {
    const result = await sendRequest(input({ url: 'http://127.0.0.1:1/nope' }));
    expect(result.response).toBeNull();
    expect(result.error?.kind).toBe('network');
  });
});

describe('describeFetchFailure', () => {
  it('classifies timeouts before anything else', () => {
    expect(describeFetchFailure(new Error('boom'), true).kind).toBe('timeout');
  });

  it('classifies abort errors', () => {
    const abort = new DOMException('The operation was aborted.', 'AbortError');
    expect(describeFetchFailure(abort, false).kind).toBe('aborted');
  });

  it('classifies "Failed to fetch" as a network problem with CORS guidance', () => {
    const error = describeFetchFailure(new TypeError('Failed to fetch'), false);
    expect(error.kind).toBe('network');
    expect(error.message.toLowerCase()).toContain('cors');
  });
});

describe('formatters', () => {
  it('formats bytes', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatBytes(3 * 1024 * 1024)).toBe('3.00 MB');
  });

  it('formats durations', () => {
    expect(formatDuration(120)).toBe('120 ms');
    expect(formatDuration(2500)).toBe('2.50 s');
  });

  it('falls back to a sensible status text', () => {
    expect(statusTextFor(200)).toBe('OK');
    expect(statusTextFor(418)).toBe('Client Error');
    expect(statusTextFor(599)).toBe('Server Error');
  });

  it('truncates long URLs for summaries', () => {
    const summary = summarizeUrl('https://api.example.com/' + 'a'.repeat(200), 30);
    expect(summary.length).toBeLessThanOrEqual(30);
    expect(summary.endsWith('…')).toBe(true);
  });
});

describe('toCurl', () => {
  const request = {
    url: 'https://api.example.com/users',
    method: 'POST' as const,
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer super-secret-token',
    },
    body: '{"name":"APIVue"}',
    skipped: [],
  };

  it('renders method, url, headers and body', () => {
    const curl = toCurl(request);
    expect(curl).toContain('curl');
    expect(curl).toContain('-X POST');
    expect(curl).toContain('Content-Type: application/json');
    expect(curl).toContain('--data-raw');
  });

  it('masks secrets when requested', () => {
    const curl = toCurl(request, { redactSecrets: true });
    expect(curl).not.toContain('super-secret-token');
    expect(curl).toContain('••••••');
  });

  it('omits -X for GET', () => {
    const curl = toCurl({ ...request, method: 'GET', body: undefined });
    expect(curl).not.toContain('-X');
  });

  it('escapes single quotes for the shell', () => {
    expect(shellQuote("it's")).toBe(`'it'\\''s'`);
  });
});
