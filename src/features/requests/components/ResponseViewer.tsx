import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Copy,
  Clock,
  Download,
  AlertCircle,
  WifiOff,
  Timer,
  Braces,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  formatBytes,
  formatDuration,
} from '@/lib/http/execute';
import type { HttpRequestError, ResponseResult } from '@/lib/http/types';

interface ResponseViewerProps {
  response: ResponseResult | null;
  error: HttpRequestError | null;
  loading: boolean;
  onCopy: (value: string, label: string) => void;
}

export function statusTone(status: number): string {
  if (status >= 200 && status < 300) return 'status-ok';
  if (status >= 300 && status < 400) return 'status-info';
  if (status >= 400 && status < 500) return 'status-warn';
  return 'status-error';
}

/* ------------------------------------------------------------------
 * JSON tokenizer.
 *
 * Deliberately not a regex-to-HTML one-liner: we build a token list and
 * let React render the spans, so response bodies can never inject markup.
 * One pass, linear, and only ever runs over an already-parsed body.
 * ------------------------------------------------------------------ */

type Token = { text: string; cls?: string };

const JSON_TOKEN =
  /("(?:\\.|[^"\\])*")(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false|null)\b|([{}[\],])/g;

function tokenizeJson(source: string): Token[] {
  const tokens: Token[] = [];
  let last = 0;
  let match: RegExpExecArray | null;

  JSON_TOKEN.lastIndex = 0;
  while ((match = JSON_TOKEN.exec(source)) !== null) {
    if (match.index > last) tokens.push({ text: source.slice(last, match.index) });
    const [full, str, colon, num, literal, punct] = match;

    if (str !== undefined) {
      if (colon !== undefined) {
        tokens.push({ text: str, cls: 'tok-key' });
        tokens.push({ text: colon, cls: 'tok-punct' });
      } else {
        tokens.push({ text: str, cls: 'tok-string' });
      }
    } else if (num !== undefined) {
      tokens.push({ text: full, cls: 'tok-number' });
    } else if (literal !== undefined) {
      tokens.push({ text: full, cls: full === 'null' ? 'tok-null' : 'tok-boolean' });
    } else if (punct !== undefined) {
      tokens.push({ text: full, cls: 'tok-punct' });
    }
    last = match.index + full.length;
  }
  if (last < source.length) tokens.push({ text: source.slice(last) });
  return tokens;
}

function HighlightedJson({ source }: { source: string }) {
  const tokens = useMemo(() => tokenizeJson(source), [source]);
  return (
    <>
      {tokens.map((token, i) =>
        token.cls ? (
          <span key={i} className={token.cls}>
            {token.text}
          </span>
        ) : (
          <span key={i}>{token.text}</span>
        ),
      )}
    </>
  );
}

function CodeBlock({
  children,
  onCopy,
  highlight = false,
  label,
}: {
  children: string;
  onCopy?: () => void;
  highlight?: boolean;
  label?: string;
}) {
  return (
    <div className="group relative">
      <pre className="code-surface max-h-[52vh] overflow-auto scrollbar-thin p-3 font-mono text-[12px] leading-[1.65]">
        <code className="whitespace-pre-wrap break-words">
          {highlight ? <HighlightedJson source={children} /> : children}
        </code>
      </pre>
      {onCopy ? (
        <Button
          variant="subtle"
          size="icon-sm"
          aria-label={label ?? 'Copy'}
          onClick={onCopy}
          className="absolute right-2 top-2 h-7 w-7 opacity-100 transition-opacity duration-150 focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
      ) : null}
    </div>
  );
}

function MetaChip({
  icon: Icon,
  children,
  title,
}: {
  icon: React.ElementType;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <span
      title={title}
      className="inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-surface-2/70 px-2 py-1 font-mono text-[11px] tabular-nums text-muted-foreground"
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {children}
    </span>
  );
}

export function ResponseViewer({ response, error, loading, onCopy }: ResponseViewerProps) {
  const [tab, setTab] = useState('body');

  const prettyBody = useMemo(() => {
    if (!response) return '';
    if (response.isJson) return JSON.stringify(response.json, null, 2);
    return response.bodyText;
  }, [response]);

  if (loading) {
    return (
      <div
        className="flex h-full min-h-[260px] flex-col items-center justify-center gap-3 rounded-xl border border-border/70 bg-surface-1/40 p-8"
        aria-busy="true"
        aria-live="polite"
      >
        <div className="progress-track w-40" aria-hidden="true">
          <div className="progress-sweep" />
        </div>
        <p className="font-mono text-[12px] font-medium">Sending request…</p>
        <p className="text-xs text-muted-foreground">You can cancel at any time.</p>
      </div>
    );
  }

  if (error) {
    const Icon =
      error.kind === 'timeout' ? Timer : error.kind === 'aborted' ? Clock : WifiOff;
    return (
      <div className="response-enter flex h-full min-h-[260px] flex-col items-center justify-center gap-3 rounded-xl border border-destructive/25 bg-destructive/[0.04] p-8 text-center">
        <div className="rounded-full bg-destructive/10 p-3 text-destructive">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <p className="text-sm font-semibold text-destructive">
          {error.kind === 'invalid-url'
            ? 'Invalid request'
            : error.kind === 'timeout'
              ? 'Request timed out'
              : error.kind === 'aborted'
                ? 'Request cancelled'
                : 'Network problem'}
        </p>
        <p className="max-w-md text-xs leading-relaxed text-muted-foreground">{error.message}</p>
        {error.kind === 'network' ? (
          <p className="mt-1 max-w-md rounded-lg border border-border/70 bg-surface-2/60 px-3 py-2 text-left text-[11px] leading-relaxed text-muted-foreground">
            <strong className="text-foreground">About CORS:</strong> browsers block
            cross-origin responses unless the server sends
            <code className="mx-1 rounded bg-muted px-1 py-0.5 font-mono">Access-Control-Allow-Origin</code>.
            APIVue sends requests directly from your browser — there is no proxy — so a
            server without CORS headers will fail here even though it works in cURL.
          </p>
        ) : null}
      </div>
    );
  }

  if (!response) {
    return (
      <div className="flex h-full min-h-[260px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 bg-surface-1/20 p-8 text-center">
        <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface-2">
          <Braces className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        </div>
        <p className="text-sm font-medium">No response yet</p>
        <p className="max-w-xs text-xs text-muted-foreground">
          Enter a URL and press Send. Status, timing, headers and the body will appear here.
        </p>
      </div>
    );
  }

  const bodyEmpty = prettyBody.length === 0;

  return (
    <div className="response-enter flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-xs font-semibold tabular-nums',
            statusTone(response.status),
          )}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
          {response.status} {response.statusText}
        </span>
        <MetaChip icon={Clock} title="Total time">
          {formatDuration(response.durationMs)}
        </MetaChip>
        <MetaChip icon={Download} title="Response size">
          {formatBytes(response.sizeBytes)}
        </MetaChip>
        {response.redirected ? (
          <span className="status-info inline-flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-[11px]">
            redirected
          </span>
        ) : null}
        {response.truncated ? (
          <span className="status-warn inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px]">
            <AlertTriangle className="h-3 w-3" aria-hidden="true" />
            body truncated at 1 MB
          </span>
        ) : null}
      </div>

      <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList>
            <TabsTrigger value="body" className="px-2.5 text-xs">
              Body
            </TabsTrigger>
            <TabsTrigger value="headers" className="px-2.5 text-xs">
              Headers
              <span className="ml-1.5 rounded bg-foreground/[0.06] px-1 py-px font-mono text-[10px] tabular-nums">
                {response.headers.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="raw" className="px-2.5 text-xs">
              Raw
            </TabsTrigger>
          </TabsList>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 rounded-md px-2 text-xs text-muted-foreground hover:text-foreground"
            disabled={bodyEmpty}
            onClick={() => onCopy(prettyBody, 'Response body copied')}
          >
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            Copy body
          </Button>
        </div>

        <TabsContent value="body" className="mt-2 min-h-0 flex-1">
          {bodyEmpty ? (
            <p className="rounded-xl border border-dashed border-border/70 px-3 py-10 text-center text-xs text-muted-foreground">
              This response has an empty body.
            </p>
          ) : response.isJson ? (
            <>
              <div className="mb-1.5 flex items-center gap-1.5 text-[11px] text-success">
                <Check className="h-3 w-3" aria-hidden="true" />
                Valid JSON
                <span className="ml-auto truncate font-mono text-muted-foreground">
                  {response.contentType}
                </span>
              </div>
              <CodeBlock
                highlight
                label="Copy formatted body"
                onCopy={() => onCopy(prettyBody, 'Response body copied')}
              >
                {prettyBody}
              </CodeBlock>
            </>
          ) : (
            <>
              <div className="mb-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                Not JSON — showing text
                <span className="ml-auto truncate font-mono">
                  {response.contentType ?? 'no content-type'}
                </span>
              </div>
              <CodeBlock
                label="Copy response body"
                onCopy={() => onCopy(prettyBody, 'Response body copied')}
              >
                {prettyBody}
              </CodeBlock>
            </>
          )}
        </TabsContent>

        <TabsContent value="headers" className="mt-2 min-h-0 flex-1">
          <div className="max-h-[52vh] overflow-auto rounded-xl border border-border/70 scrollbar-thin">
            <table className="w-full text-left font-mono text-[11px]">
              <tbody>
                {response.headers.map(([key, value]) => (
                  <tr
                    key={key}
                    className="border-b border-border/50 transition-colors last:border-0 hover:bg-surface-2/60"
                  >
                    <td className="w-1/3 whitespace-nowrap px-3 py-1.5 align-top font-semibold text-foreground/80">
                      {key}
                    </td>
                    <td className="break-all px-3 py-1.5 text-muted-foreground">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            Browsers only expose "simple" response headers plus those listed in
            <code className="mx-1 rounded bg-muted px-1 py-0.5 font-mono">Access-Control-Expose-Headers</code>.
          </p>
        </TabsContent>

        <TabsContent value="raw" className="mt-2 min-h-0 flex-1">
          <CodeBlock
            label="Copy raw response"
            onCopy={() =>
              onCopy(
                `${response.status} ${response.statusText}\n${response.headers
                  .map(([k, v]) => `${k}: ${v}`)
                  .join('\n')}\n\n${response.bodyText}`,
                'Raw response copied',
              )
            }
          >{`${response.status} ${response.statusText}\n${response.headers
            .map(([k, v]) => `${k}: ${v}`)
            .join('\n')}\n\n${response.bodyText}`}</CodeBlock>
        </TabsContent>
      </Tabs>
    </div>
  );
}
