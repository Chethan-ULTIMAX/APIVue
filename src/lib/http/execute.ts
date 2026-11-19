/**
 * Executes HTTP requests from the browser and normalises the response.
 *
 * Design notes
 * ------------
 * * Requests run in the user's browser via `fetch`. This is deliberate:
 *   APIVue does not ship a server-side proxy, so there is no way for
 *   APIVue to be used to reach internal network resources. The trade-off
 *   is that browser CORS rules apply — see `describeCorsFailure`.
 * * Requests are only ever sent when the user presses Send.
 * * There is no automatic retry. Retrying a POST/PUT/PATCH/DELETE could
 *   duplicate a state change, so the user stays in control.
 * * Redirects are followed by the browser but the final URL is reported.
 * * Bodies larger than MAX_BODY_BYTES are truncated for display while the
 *   reported size reflects the real payload.
 */

import { resolveRequest, type ResolveInput } from './resolve';
import {
  HttpRequestError,
  type ResponseResult,
  type ResolvedRequest,
} from './types';

export const MAX_BODY_BYTES = 1024 * 1024; // 1 MiB displayed
const DEFAULT_TIMEOUT_MS = 30_000;

export interface SendOptions {
  timeoutMs?: number;
  signal?: AbortSignal;
}

function isJsonContentType(contentType: string | null): boolean {
  if (!contentType) return false;
  const lowered = contentType.toLowerCase();
  return (
    lowered.includes('application/json') ||
    lowered.includes('+json') ||
    lowered.includes('application/problem+json')
  );
}

/**
 * Turn a low-level fetch failure into an actionable message.
 *
 * Browsers intentionally hide the difference between "DNS failed", "connection
 * refused" and "blocked by CORS" — all surface as `TypeError: Failed to fetch`.
 * `describeCorsFailure` explains that honestly instead of guessing.
 */
export function describeFetchFailure(error: unknown, timedOut: boolean): HttpRequestError {
  if (error instanceof HttpRequestError) return error;
  if (timedOut) {
    return new HttpRequestError(
      'timeout',
      'The request timed out before the server responded.',
    );
  }
  if (error instanceof DOMException && error.name === 'AbortError') {
    return new HttpRequestError('aborted', 'Request cancelled.');
  }
  const message = error instanceof Error ? error.message : String(error);
  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return new HttpRequestError(
      'network',
      'The request could not be completed. The server may be unreachable, ' +
        'offline, or blocked by browser CORS policy (see the CORS note below).',
    );
  }
  return new HttpRequestError('network', message || 'Request failed.');
}

export interface SendResult {
  request: ResolvedRequest;
  response: ResponseResult | null;
  error: HttpRequestError | null;
  /** True when a non-2xx status was received (not a transport failure). */
  httpError: boolean;
}

/**
 * Send a request built from a draft.
 * Never throws: transport failures are returned in `error`.
 */
export async function sendRequest(
  input: ResolveInput,
  options: SendOptions = {},
): Promise<SendResult> {
  let request: ResolvedRequest;
  try {
    request = resolveRequest(input);
  } catch (error) {
    return {
      request: {
        url: input.url,
        method: input.method,
        headers: {},
        skipped: [],
      },
      response: null,
      error:
        error instanceof HttpRequestError
          ? error
          : new HttpRequestError('invalid-url', 'The request could not be built.'),
      httpError: false,
    };
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  let timedOut = false;

  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  const onExternalAbort = () => controller.abort();
  options.signal?.addEventListener('abort', onExternalAbort, { once: true });

  const started = performance.now();

  try {
    const response = await fetch(request.url, {
      method: request.method,
      headers: request.headers,
      body: request.body,
      signal: controller.signal,
      mode: 'cors',
      credentials: 'omit',
      redirect: 'follow',
      cache: 'no-store',
      referrerPolicy: 'no-referrer',
    });

    const rawText = await response.text();
    const durationMs = Math.round(performance.now() - started);

    const sizeBytes =
      typeof TextEncoder !== 'undefined'
        ? new TextEncoder().encode(rawText).length
        : rawText.length;

    const truncated = sizeBytes > MAX_BODY_BYTES;
    const bodyText = truncated ? rawText.slice(0, MAX_BODY_BYTES) : rawText;

    const contentType = response.headers.get('content-type');
    const isJson = isJsonContentType(contentType);
    let json: unknown = null;
    if (isJson) {
      try {
        json = JSON.parse(bodyText);
      } catch {
        json = null;
      }
    }

    return {
      request,
      httpError: !response.ok,
      error: null,
      response: {
        status: response.status,
        statusText: response.statusText || statusTextFor(response.status),
        ok: response.ok,
        durationMs,
        sizeBytes,
        headers: [...response.headers.entries()],
        bodyText,
        contentType,
        isJson: isJson && json !== null,
        json,
        truncated,
        redirected: response.redirected,
        finalUrl: response.url || request.url,
        receivedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    return {
      request,
      response: null,
      httpError: false,
      error: describeFetchFailure(error, timedOut),
    };
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort', onExternalAbort);
  }
}

const STATUS_TEXT: Record<number, string> = {
  200: 'OK',
  201: 'Created',
  202: 'Accepted',
  204: 'No Content',
  301: 'Moved Permanently',
  302: 'Found',
  304: 'Not Modified',
  307: 'Temporary Redirect',
  308: 'Permanent Redirect',
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  408: 'Request Timeout',
  409: 'Conflict',
  415: 'Unsupported Media Type',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
};

export function statusTextFor(status: number): string {
  return STATUS_TEXT[status] ?? (status >= 500 ? 'Server Error' : status >= 400 ? 'Client Error' : 'Response');
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

/** Escape a value for POSIX shell single-quoted strings. */
export function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export interface CurlOptions {
  /** Mask Authorization / api-key values in the output. */
  redactSecrets?: boolean;
}

/**
 * Render a resolved request as a copy-pastable cURL command.
 * The body is embedded as a here-document friendly single quoted string.
 */
export function toCurl(
  request: ResolvedRequest,
  options: CurlOptions = {},
): string {
  const redact = options.redactSecrets ?? false;
  const parts: string[] = ['curl'];

  if (request.method !== 'GET') parts.push(`-X ${request.method}`);
  parts.push(shellQuote(request.url));

  for (const [key, value] of Object.entries(request.headers)) {
    const hidden =
      redact &&
      (/^authorization$/i.test(key) ||
        /api[-_]?key/i.test(key) ||
        /token/i.test(key) ||
        /^cookie$/i.test(key));
    parts.push(`-H ${shellQuote(`${key}: ${hidden ? '••••••' : value}`)}`);
  }

  if (request.body !== undefined && request.body !== '') {
    parts.push(`--data-raw ${shellQuote(request.body)}`);
  }

  return parts.join(' \\\n  ');
}

/** Compact one-line representation used in the history list. */
export function summarizeUrl(url: string, max = 72): string {
  try {
    const parsed = new URL(url);
    const display = `${parsed.origin}${parsed.pathname}${parsed.search}`;
    return display.length > max ? `${display.slice(0, max - 1)}…` : display;
  } catch {
    return url.length > max ? `${url.slice(0, max - 1)}…` : url;
  }
}
