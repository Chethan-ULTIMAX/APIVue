import { describe, expect, it } from 'vitest';

import {
  activeRows,
  applyVariables,
  missingVariables,
  normalizeUrl,
  prettifyJson,
  referencedVariables,
  resolveBody,
  resolveRequest,
  validateJsonBody,
  type ResolveInput,
} from '@/lib/http/resolve';
import { HttpRequestError, type KeyValueRow } from '@/lib/http/types';

const row = (key: string, value = '', enabled = true): KeyValueRow => ({
  id: `${key}-${value}-${Math.random()}`,
  key,
  value,
  enabled,
});

function input(overrides: Partial<ResolveInput> = {}): ResolveInput {
  return {
    method: 'GET',
    url: 'https://api.example.com/users',
    params: [],
    headers: [],
    bodyMode: 'none',
    body: '',
    auth: { mode: 'none' },
    variables: [],
    ...overrides,
  };
}

describe('normalizeUrl', () => {
  it('accepts https URLs as-is', () => {
    expect(normalizeUrl('https://api.example.com/v1').toString()).toBe(
      'https://api.example.com/v1',
    );
  });

  it('upgrades a bare hostname to https', () => {
    expect(normalizeUrl('api.example.com/users').toString()).toBe(
      'https://api.example.com/users',
    );
  });

  it('keeps http as an explicit choice', () => {
    expect(normalizeUrl('http://localhost:3000/health').protocol).toBe('http:');
  });

  it('rejects empty input', () => {
    expect(() => normalizeUrl('   ')).toThrow(HttpRequestError);
    try {
      normalizeUrl('   ');
    } catch (error) {
      expect((error as HttpRequestError).kind).toBe('invalid-url');
    }
  });

  it('rejects non-http protocols, including ones without an authority', () => {
    expect(() => normalizeUrl('javascript:alert(1)')).toThrow(/Only http/);
    expect(() => normalizeUrl('data:text/html,<script>')).toThrow(/Only http/);
    expect(() => normalizeUrl('file:///etc/passwd')).toThrow(/Only http/);
    expect(() => normalizeUrl('ftp://example.com')).toThrow(/Only http/);
    expect(() => normalizeUrl('mailto:a@b.test')).toThrow(/Only http/);
  });

  it('accepts uppercase HTTP schemes', () => {
    expect(normalizeUrl('HTTPS://Example.com/x').hostname).toBe('example.com');
  });

  it('rejects whitespace inside a URL', () => {
    expect(() => normalizeUrl('https://example.com/a b')).toThrow(/whitespace/);
  });
});

describe('applyVariables', () => {
  const vars = [
    { key: 'base_url', value: 'https://api.example.com' },
    { key: 'version', value: 'v2' },
  ];

  it('substitutes known variables', () => {
    expect(applyVariables('{{base_url}}/{{version}}/users', vars)).toBe(
      'https://api.example.com/v2/users',
    );
  });

  it('tolerates whitespace inside the placeholder', () => {
    expect(applyVariables('{{ base_url }}/x', vars)).toBe('https://api.example.com/x');
  });

  it('leaves unknown variables untouched', () => {
    expect(applyVariables('{{unknown}}/x', vars)).toBe('{{unknown}}/x');
  });

  it('lists referenced variables', () => {
    expect(referencedVariables('{{a}}/{{b}}/{{a}}')).toEqual(['a', 'b']);
  });

  it('reports variables that are referenced but undefined or empty', () => {
    expect(missingVariables(['{{base_url}}', '{{token}}'], vars)).toEqual(['token']);
    expect(
      missingVariables(['{{token}}'], [{ key: 'token', value: '' }]),
    ).toEqual(['token']);
  });
});

describe('resolveRequest', () => {
  it('appends enabled query params and skips disabled ones', () => {
    const resolved = resolveRequest(
      input({
        params: [row('page', '2'), row('debug', 'true', false), row('', 'ignored')],
      }),
    );
    const url = new URL(resolved.url);
    expect(url.searchParams.get('page')).toBe('2');
    expect(url.searchParams.has('debug')).toBe(false);
  });

  it('preserves query params already present in the URL', () => {
    const resolved = resolveRequest(
      input({ url: 'https://api.example.com/x?existing=1', params: [row('extra', '2')] }),
    );
    const url = new URL(resolved.url);
    expect(url.searchParams.get('existing')).toBe('1');
    expect(url.searchParams.get('extra')).toBe('2');
  });

  it('builds headers and reports empty values as skipped', () => {
    const resolved = resolveRequest(
      input({ headers: [row('Accept', 'application/json'), row('X-Empty', '')] }),
    );
    expect(resolved.headers.Accept).toBe('application/json');
    expect(resolved.headers['X-Empty']).toBeUndefined();
    expect(resolved.skipped).toEqual(['X-Empty']);
  });

  it('adds a bearer token', () => {
    const resolved = resolveRequest(
      input({ auth: { mode: 'bearer', token: 'abc123' } }),
    );
    expect(resolved.headers.Authorization).toBe('Bearer abc123');
  });

  it('resolves a bearer token from an environment variable', () => {
    const resolved = resolveRequest(
      input({
        auth: { mode: 'bearer', token: '{{token}}' },
        variables: [{ key: 'token', value: 'env-token' }],
      }),
    );
    expect(resolved.headers.Authorization).toBe('Bearer env-token');
  });

  it('encodes basic auth', () => {
    const resolved = resolveRequest(
      input({ auth: { mode: 'basic', username: 'user', password: 'pass' } }),
    );
    expect(resolved.headers.Authorization).toBe(`Basic ${btoa('user:pass')}`);
  });

  it('places an api key in a header or the query string', () => {
    const headerCase = resolveRequest(
      input({ auth: { mode: 'api-key', apiKeyName: 'X-API-Key', apiKeyValue: 'k1' } }),
    );
    expect(headerCase.headers['X-API-Key']).toBe('k1');

    const queryCase = resolveRequest(
      input({
        auth: {
          mode: 'api-key',
          apiKeyName: 'key',
          apiKeyValue: 'k2',
          apiKeyLocation: 'query',
        },
      }),
    );
    expect(new URL(queryCase.url).searchParams.get('key')).toBe('k2');
    expect(queryCase.headers.key).toBeUndefined();
  });

  it('does not attach a body to GET or HEAD', () => {
    const get = resolveRequest(input({ method: 'GET', bodyMode: 'json', body: '{"a":1}' }));
    expect(get.body).toBeUndefined();
    const head = resolveRequest(input({ method: 'HEAD', bodyMode: 'json', body: '{"a":1}' }));
    expect(head.body).toBeUndefined();
  });

  it('sets Content-Type for JSON bodies but respects an explicit one', () => {
    const auto = resolveRequest(
      input({ method: 'POST', bodyMode: 'json', body: '{"a":1}' }),
    );
    expect(auto.headers['Content-Type']).toBe('application/json');
    expect(auto.body).toBe('{"a":1}');

    const explicit = resolveRequest(
      input({
        method: 'POST',
        bodyMode: 'json',
        body: '{"a":1}',
        headers: [row('content-type', 'application/vnd.api+json')],
      }),
    );
    expect(explicit.headers['Content-Type']).toBeUndefined();
    expect(explicit.headers['content-type']).toBe('application/vnd.api+json');
  });

  it('substitutes variables inside the body', () => {
    const resolved = resolveRequest(
      input({
        method: 'POST',
        bodyMode: 'json',
        body: '{"name":"{{name}}"}',
        variables: [{ key: 'name', value: 'APIVue' }],
      }),
    );
    expect(resolved.body).toBe('{"name":"APIVue"}');
  });

  it('throws for an invalid URL instead of sending', () => {
    expect(() => resolveRequest(input({ url: '' }))).toThrow(HttpRequestError);
  });
});

describe('resolveBody', () => {
  it('normalises url-encoded bodies', () => {
    const body = resolveBody(
      input({
        method: 'POST',
        bodyMode: 'x-www-form-urlencoded',
        body: 'name=APIVue\nrole=developer',
      }),
    );
    expect(body).toBe('name=APIVue&role=developer');
  });

  it('encodes reserved characters in a single url-encoded pair', () => {
    const body = resolveBody(
      input({ method: 'POST', bodyMode: 'x-www-form-urlencoded', body: 'q=a b&c' }),
    );
    expect(body).toBe('q=a%20b%26c');
  });

  it('accepts a pasted query string', () => {
    const body = resolveBody(
      input({ method: 'POST', bodyMode: 'x-www-form-urlencoded', body: 'a=1&b=2' }),
    );
    expect(body).toBe('a=1&b=2');
  });
});

describe('json helpers', () => {
  it('validates JSON bodies', () => {
    expect(validateJsonBody('{"a":1}')).toBeNull();
    expect(validateJsonBody('')).toBeNull();
    expect(validateJsonBody('{oops}')).toMatch(/Invalid JSON/);
  });

  it('pretty prints valid JSON and rejects invalid JSON', () => {
    expect(prettifyJson('{"a":1}')).toBe('{\n  "a": 1\n}');
    expect(prettifyJson('not json')).toBeNull();
  });
});

describe('activeRows', () => {
  it('keeps only enabled rows with a key', () => {
    expect(activeRows([row('a', '1'), row('b', '2', false), row('', '3')])).toHaveLength(1);
  });
});
