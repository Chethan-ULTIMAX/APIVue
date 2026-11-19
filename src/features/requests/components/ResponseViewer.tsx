import { useMemo, useState } from 'react';
import { AlertTriangle, Check, Copy, Clock, Download, AlertCircle, WifiOff, Timer } from 'lucide-react';

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
  if (status >= 200 && status < 300) {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
  }
  if (status >= 300 && status < 400) {
    return 'border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400';
  }
  if (status >= 400 && status < 500) {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400';
  }
  return 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400';
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="max-h-[52vh] overflow-auto rounded-lg border border-border/70 bg-muted/40 p-3 font-mono text-[12px] leading-relaxed scrollbar-thin">
      <code className="whitespace-pre-wrap break-words">{children}</code>
    </pre>
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
      <div className="flex h-full min-h-[260px] flex-col items-center justify-center gap-3 rounded-xl border border-border/70 bg-card/40 p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
        <p className="text-sm font-medium">Sending request…</p>
        <p className="text-xs text-muted-foreground">You can cancel at any time.</p>
      </div>
    );
  }

  if (error) {
    const Icon =
      error.kind === 'timeout' ? Timer : error.kind === 'aborted' ? Clock : WifiOff;
    return (
      <div className="flex h-full min-h-[260px] flex-col items-center justify-center gap-3 rounded-xl border border-destructive/25 bg-destructive/[0.04] p-8 text-center">
        <div className="rounded-full bg-destructive/10 p-3 text-destructive">
          <Icon className="h-5 w-5" />
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
          <p className="mt-1 max-w-md rounded-lg border border-border/70 bg-muted/40 px-3 py-2 text-left text-[11px] leading-relaxed text-muted-foreground">
            <strong className="text-foreground">About CORS:</strong> browsers block
            cross-origin responses unless the server sends
            <code className="mx-1 rounded bg-background px-1 py-0.5 font-mono">Access-Control-Allow-Origin</code>.
            APIVue sends requests directly from your browser — there is no proxy — so a
            server without CORS headers will fail here even though it works in cURL.
          </p>
        ) : null}
      </div>
    );
  }

  if (!response) {
    return (
      <div className="flex h-full min-h-[260px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 bg-card/20 p-8 text-center">
        <AlertCircle className="h-6 w-6 text-muted-foreground/60" />
        <p className="text-sm font-medium">No response yet</p>
        <p className="max-w-xs text-xs text-muted-foreground">
          Enter a URL and press Send. Status, timing, headers and the body will appear here.
        </p>
      </div>
    );
  }

  const bodyEmpty = prettyBody.length === 0;

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-xs font-semibold',
            statusTone(response.status),
          )}
        >
          {response.status} {response.statusText}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-muted/40 px-2 py-1 font-mono text-[11px] text-muted-foreground">
          <Clock className="h-3 w-3" />
          {formatDuration(response.durationMs)}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-muted/40 px-2 py-1 font-mono text-[11px] text-muted-foreground">
          <Download className="h-3 w-3" />
          {formatBytes(response.sizeBytes)}
        </span>
        {response.redirected ? (
          <span className="inline-flex items-center gap-1 rounded-md border border-sky-500/30 bg-sky-500/10 px-2 py-1 text-[11px] text-sky-600 dark:text-sky-400">
            redirected
          </span>
        ) : null}
        {response.truncated ? (
          <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-3 w-3" />
            body truncated at 1 MB
          </span>
        ) : null}
      </div>

      <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList className="h-8 rounded-lg bg-muted/50 p-0.5">
            <TabsTrigger value="body" className="h-7 rounded-md px-2.5 text-xs">
              Body
            </TabsTrigger>
            <TabsTrigger value="headers" className="h-7 rounded-md px-2.5 text-xs">
              Headers
              <span className="ml-1 rounded bg-background/70 px-1 font-mono text-[10px]">
                {response.headers.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="raw" className="h-7 rounded-md px-2.5 text-xs">
              Raw
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 rounded-md px-2 text-xs text-muted-foreground hover:text-foreground"
              disabled={bodyEmpty}
              onClick={() => onCopy(prettyBody, 'Response body copied')}
            >
              <Copy className="h-3.5 w-3.5" />
              Copy body
            </Button>
          </div>
        </div>

        <TabsContent value="body" className="mt-2 min-h-0 flex-1">
          {bodyEmpty ? (
            <p className="rounded-lg border border-dashed border-border/70 px-3 py-10 text-center text-xs text-muted-foreground">
              This response has an empty body.
            </p>
          ) : response.isJson ? (
            <>
              <div className="mb-1.5 flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
                <Check className="h-3 w-3" /> Valid JSON
                <span className="ml-auto font-mono text-muted-foreground">
                  {response.contentType}
                </span>
              </div>
              <CodeBlock>{prettyBody}</CodeBlock>
            </>
          ) : (
            <>
              <div className="mb-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                Not JSON — showing text
                <span className="ml-auto truncate font-mono">
                  {response.contentType ?? 'no content-type'}
                </span>
              </div>
              <CodeBlock>{prettyBody}</CodeBlock>
            </>
          )}
        </TabsContent>

        <TabsContent value="headers" className="mt-2 min-h-0 flex-1">
          <div className="max-h-[52vh] overflow-auto rounded-lg border border-border/70 scrollbar-thin">
            <table className="w-full text-left font-mono text-[11px]">
              <tbody>
                {response.headers.map(([key, value]) => (
                  <tr key={key} className="border-b border-border/50 last:border-0">
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
            <code className="mx-1 rounded bg-muted px-1 py-0.5">Access-Control-Expose-Headers</code>.
          </p>
        </TabsContent>

        <TabsContent value="raw" className="mt-2 min-h-0 flex-1">
          <CodeBlock>{`${response.status} ${response.statusText}\n${response.headers
            .map(([k, v]) => `${k}: ${v}`)
            .join('\n')}\n\n${response.bodyText}`}</CodeBlock>
        </TabsContent>
      </Tabs>
    </div>
  );
}
