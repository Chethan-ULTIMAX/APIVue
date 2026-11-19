import { beforeEach, describe, expect, it } from 'vitest';

import {
  clearHistory,
  readHistory,
  recordHistory,
  removeHistoryEntry,
  sanitizeHeaders,
  type RecordHistoryInput,
} from '@/lib/http/history';
import type { KeyValueRow } from '@/lib/http/types';

const row = (key: string, value: string): KeyValueRow => ({
  id: `${key}-${value}`,
  key,
  value,
  enabled: true,
});

function entry(overrides: Partial<RecordHistoryInput> = {}): RecordHistoryInput {
  return {
    method: 'GET',
    url: 'https://api.example.com/users?page=2',
    status: 200,
    ok: true,
    durationMs: 42,
    sizeBytes: 128,
    params: [],
    headers: [],
    bodyMode: 'none',
    body: '',
    ...overrides,
  };
}

describe('request history', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('records an entry and reads it back', () => {
    recordHistory(entry());
    const history = readHistory();
    expect(history).toHaveLength(1);
    expect(history[0].status).toBe(200);
    expect(history[0].method).toBe('GET');
  });

  it('keeps newest entries first', () => {
    recordHistory(entry({ url: 'https://a.test/1' }));
    recordHistory(entry({ url: 'https://a.test/2' }));
    expect(readHistory()[0].url).toBe('https://a.test/2');
  });

  it('strips URL-embedded credentials', () => {
    recordHistory(entry({ url: 'https://user:secret@api.example.com/x' }));
    expect(readHistory()[0].url).not.toContain('secret');
    expect(readHistory()[0].url).not.toContain('user:');
  });

  it('never stores authorization or token headers', () => {
    recordHistory(
      entry({
        headers: [
          row('Authorization', 'Bearer super-secret'),
          row('X-Api-Key', 'secret-key'),
          row('Cookie', 'session=abc'),
          row('Content-Type', 'application/json'),
          row('X-Custom-Trace', 'keep-me'),
        ],
      }),
    );
    const stored = readHistory()[0].headers;
    const names = stored.map((header) => header.key);
    expect(names).toContain('Content-Type');
    expect(names).toContain('X-Custom-Trace');
    expect(names).not.toContain('Authorization');
    expect(names).not.toContain('X-Api-Key');
    expect(names).not.toContain('Cookie');
    expect(JSON.stringify(stored)).not.toContain('super-secret');
  });

  it('can remove one entry and clear everything', () => {
    recordHistory(entry({ url: 'https://a.test/1' }));
    recordHistory(entry({ url: 'https://a.test/2' }));
    const first = readHistory()[0];
    expect(removeHistoryEntry(first.id)).toHaveLength(1);
    expect(clearHistory()).toHaveLength(0);
    expect(readHistory()).toHaveLength(0);
  });

  it('caps the history length', () => {
    for (let i = 0; i < 60; i += 1) {
      recordHistory(entry({ url: `https://a.test/${i}` }));
    }
    expect(readHistory()).toHaveLength(40);
  });

  it('recovers from corrupt storage', () => {
    window.localStorage.setItem('apivue.request-history.v1', 'not-json');
    expect(readHistory()).toEqual([]);
  });
});

describe('sanitizeHeaders', () => {
  it('drops disabled and sensitive headers', () => {
    const kept = sanitizeHeaders([
      { id: '1', key: 'Accept', value: 'text/html', enabled: true },
      { id: '2', key: 'X-Secret-Token', value: 'nope', enabled: true },
      { id: '3', key: 'X-Off', value: 'x', enabled: false },
    ]);
    expect(kept.map((row) => row.key)).toEqual(['Accept']);
  });
});
