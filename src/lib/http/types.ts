/**
 * Shared types for the APIVue request builder.
 *
 * These types are framework-free so the request/response logic can be
 * unit tested without React or a browser.
 */

export const HTTP_METHODS = [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS',
] as const;

export type HttpMethod = (typeof HTTP_METHODS)[number];

/** Methods that never carry a request body. */
export const BODYLESS_METHODS: readonly HttpMethod[] = ['GET', 'HEAD'];

/** Methods that are safe (read-only) and therefore safe to repeat. */
export const SAFE_METHODS: readonly HttpMethod[] = ['GET', 'HEAD', 'OPTIONS'];

export type BodyMode = 'none' | 'json' | 'text' | 'x-www-form-urlencoded';

export const BODY_MODES: ReadonlyArray<{ value: BodyMode; label: string }> = [
  { value: 'none', label: 'None' },
  { value: 'json', label: 'JSON' },
  { value: 'text', label: 'Raw text' },
  { value: 'x-www-form-urlencoded', label: 'Form URL-encoded' },
];

export type AuthMode = 'none' | 'bearer' | 'basic' | 'api-key';

export const AUTH_MODES: ReadonlyArray<{ value: AuthMode; label: string }> = [
  { value: 'none', label: 'No auth' },
  { value: 'bearer', label: 'Bearer token' },
  { value: 'basic', label: 'Basic auth' },
  { value: 'api-key', label: 'API key' },
];

export interface AuthConfig {
  mode: AuthMode;
  token?: string;
  username?: string;
  password?: string;
  apiKeyName?: string;
  apiKeyValue?: string;
  apiKeyLocation?: 'header' | 'query';
}

export interface KeyValueRow {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

export interface RequestDraft {
  method: HttpMethod;
  url: string;
  params: KeyValueRow[];
  headers: KeyValueRow[];
  bodyMode: BodyMode;
  body: string;
  auth: AuthConfig;
}

export interface EnvironmentVariable {
  key: string;
  value: string;
  /** Secret values are masked in the UI and redacted from copied cURL. */
  secret?: boolean;
}

export interface Environment {
  id: string;
  name: string;
  variables: EnvironmentVariable[];
}

export interface SavedRequest {
  id: string;
  name: string;
  collection_id: string | null;
  method: HttpMethod;
  url: string;
  params: KeyValueRow[];
  headers: KeyValueRow[];
  body_mode: BodyMode;
  body: string | null;
  auth: AuthConfig;
  updated_at: string;
}

export interface Collection {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export type HttpErrorKind =
  | 'invalid-url'
  | 'network'
  | 'timeout'
  | 'aborted'
  | 'unsupported';

/** Error thrown by the request executor with a machine-readable reason. */
export class HttpRequestError extends Error {
  readonly kind: HttpErrorKind;

  constructor(kind: HttpErrorKind, message: string) {
    super(message);
    this.name = 'HttpRequestError';
    this.kind = kind;
  }
}

export interface ResolvedRequest {
  url: string;
  method: HttpMethod;
  headers: Record<string, string>;
  body?: string;
  /** Header rows that resolved to an empty value and were skipped. */
  skipped: string[];
}

export interface ResponseResult {
  status: number;
  statusText: string;
  ok: boolean;
  /** Wall-clock time from dispatch to fully-read body, in ms. */
  durationMs: number;
  /** Body size in bytes. */
  sizeBytes: number;
  headers: Array<[string, string]>;
  bodyText: string;
  contentType: string | null;
  isJson: boolean;
  json: unknown;
  /** True when the body was cut off for display. */
  truncated: boolean;
  redirected: boolean;
  finalUrl: string;
  receivedAt: string;
}

export const DEFAULT_DRAFT: RequestDraft = {
  method: 'GET',
  url: '',
  params: [{ id: 'param-1', key: '', value: '', enabled: true }],
  headers: [{ id: 'header-1', key: '', value: '', enabled: true }],
  bodyMode: 'none',
  body: '',
  auth: { mode: 'none' },
};

export function emptyRow(id: string): KeyValueRow {
  return { id, key: '', value: '', enabled: true };
}
