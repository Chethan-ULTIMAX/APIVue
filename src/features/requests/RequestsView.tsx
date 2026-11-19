import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  ChevronRight,
  Copy,
  Eraser,
  FolderPlus,
  History,
  Layers,
  Loader2,
  Lock,
  Save,
  Search,
  Send,
  Star,
  Trash2,
  Variable,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';

import { KeyValueEditor } from './components/KeyValueEditor';
import { ResponseViewer, statusTone } from './components/ResponseViewer';
import { EnvironmentDialog } from './components/EnvironmentDialog';
import {
  AUTH_MODES,
  BODY_MODES,
  DEFAULT_DRAFT,
  HTTP_METHODS,
  type AuthMode,
  type BodyMode,
  type EnvironmentVariable,
  type HttpMethod,
  type RequestDraft,
  type ResponseResult,
} from '@/lib/http/types';
import { sendRequest, summarizeUrl, toCurl, formatDuration } from '@/lib/http/execute';
import {
  applyVariables,
  missingVariables,
  prettifyJson,
  referencedVariables,
  validateJsonBody,
} from '@/lib/http/resolve';
import {
  clearHistory,
  readHistory,
  recordHistory,
  removeHistoryEntry,
  type HistoryEntry,
} from '@/lib/http/history';
import {
  useApiRequests,
  useCollections,
  useCreateCollection,
  useDeleteRequest,
  useEnvironments,
  useSaveRequest,
  type ApiRequestRow,
} from '@/hooks/use-api-workspace';

const EMPTY_VARIABLES: EnvironmentVariable[] = [];

const METHOD_TONE: Record<HttpMethod, string> = {
  GET: 'text-emerald-600 dark:text-emerald-400',
  POST: 'text-amber-600 dark:text-amber-400',
  PUT: 'text-sky-600 dark:text-sky-400',
  PATCH: 'text-violet-600 dark:text-violet-400',
  DELETE: 'text-rose-600 dark:text-rose-400',
  HEAD: 'text-muted-foreground',
  OPTIONS: 'text-muted-foreground',
};

function rowId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function draftFromSaved(row: ApiRequestRow): RequestDraft {
  const auth = (row.auth ?? { mode: 'none' }) as unknown as RequestDraft['auth'];
  return {
    method: row.method,
    url: row.url,
    params: row.params.length ? row.params : [{ id: rowId('param'), key: '', value: '', enabled: true }],
    headers: row.headers.length
      ? row.headers
      : [{ id: rowId('header'), key: '', value: '', enabled: true }],
    bodyMode: row.body_mode,
    body: row.body ?? '',
    auth: { mode: auth.mode ?? 'none', ...auth },
  };
}

function draftFromHistory(entry: HistoryEntry): RequestDraft {
  return {
    method: entry.method,
    url: entry.url,
    params: entry.params.length ? entry.params : [{ id: rowId('param'), key: '', value: '', enabled: true }],
    headers: entry.headers.length
      ? entry.headers
      : [{ id: rowId('header'), key: '', value: '', enabled: true }],
    bodyMode: entry.bodyMode,
    body: entry.body,
    auth: { mode: 'none' },
  };
}

export function RequestsView() {
  const { user } = useAuth();
  const [draft, setDraft] = useState<RequestDraft>(DEFAULT_DRAFT);
  const [response, setResponse] = useState<ResponseResult | null>(null);
  const [error, setError] = useState<Awaited<ReturnType<typeof sendRequest>>['error']>(null);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const [savedId, setSavedId] = useState<string | null>(null);
  const [savedName, setSavedName] = useState<string | null>(null);
  const [leftTab, setLeftTab] = useState<'collections' | 'history'>('collections');
  const [search, setSearch] = useState('');
  const [history, setHistory] = useState<HistoryEntry[]>(() => readHistory());
  const [envId, setEnvId] = useState<string | null>(null);
  const [envOpen, setEnvOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveCollection, setSaveCollection] = useState<string>('none');
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [collectionName, setCollectionName] = useState('');
  const [requestTab, setRequestTab] = useState('params');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const { data: collections = [] } = useCollections();
  const { data: savedRequests = [], isLoading: savedLoading } = useApiRequests();
  const { data: environments = [] } = useEnvironments();
  const saveRequest = useSaveRequest();
  const deleteRequest = useDeleteRequest();
  const createCollection = useCreateCollection();

  const activeEnvironment = environments.find((env) => env.id === envId) ?? null;
  // Stable identity: `?? []` would re-create the array on every render and
  // silently invalidate the memos and the send callback below.
  const variables = useMemo<EnvironmentVariable[]>(
    () => activeEnvironment?.variables ?? EMPTY_VARIABLES,
    [activeEnvironment],
  );

  const resolvedPreview = useMemo(() => {
    try {
      return applyVariables(draft.url, variables);
    } catch {
      return draft.url;
    }
  }, [draft.url, variables]);

  const missing = useMemo(
    () =>
      missingVariables(
        [
          draft.url,
          draft.body,
          ...draft.headers.map((r) => r.value),
          ...draft.params.map((r) => r.value),
          draft.auth.token ?? '',
          draft.auth.apiKeyValue ?? '',
        ],
        variables,
      ),
    [draft, variables],
  );

  const jsonError = draft.bodyMode === 'json' ? validateJsonBody(draft.body) : null;

  /* ---------------------------------------------------------------- send */

  const handleSend = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    setResponse(null);

    const controller = new AbortController();
    abortRef.current = controller;

    const result = await sendRequest(
      {
        method: draft.method,
        url: draft.url,
        params: draft.params,
        headers: draft.headers,
        bodyMode: draft.bodyMode,
        body: draft.body,
        auth: draft.auth,
        variables,
      },
      { signal: controller.signal },
    );

    abortRef.current = null;
    setLoading(false);
    setError(result.error);
    setResponse(result.response);

    setHistory(
      recordHistory({
        method: draft.method,
        url: result.request.url || draft.url,
        name: savedName ?? undefined,
        status: result.response?.status ?? null,
        ok: result.response?.ok ?? false,
        durationMs: result.response?.durationMs ?? null,
        sizeBytes: result.response?.sizeBytes ?? null,
        failure: result.error?.kind,
        params: draft.params,
        headers: draft.headers,
        bodyMode: draft.bodyMode,
        // The body is the user's own content and is required to reopen the
        // request. Credentials are stripped elsewhere: auth config is never
        // recorded and sensitive headers are filtered in `sanitizeHeaders`.
        body: draft.body,
      }),
    );
  }, [draft, loading, savedName, variables]);

  const handleCancel = () => {
    abortRef.current?.abort();
    abortRef.current = null;
  };

  /* Keyboard: Cmd/Ctrl+Enter sends the request. */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        void handleSend();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleSend]);

  /* --------------------------------------------------------------- utils */

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(label);
      window.setTimeout(() => setCopiedKey(null), 1600);
      toast({ title: label });
    } catch {
      toast({
        title: 'Clipboard unavailable',
        description: 'Your browser blocked clipboard access for this page.',
        variant: 'destructive',
      });
    }
  };

  const handleCopyCurl = () => {
    const preview = {
      url: resolvedPreview,
      method: draft.method,
      headers: Object.fromEntries(
        draft.headers
          .filter((row) => row.enabled && row.key.trim())
          .map((row) => [row.key.trim(), applyVariables(row.value, variables)]),
      ),
      body: draft.bodyMode === 'none' ? undefined : applyVariables(draft.body, variables),
      skipped: [],
    };
    if (draft.auth.mode === 'bearer' && draft.auth.token) {
      preview.headers.Authorization = `Bearer ${applyVariables(draft.auth.token, variables)}`;
    }
    void copy(toCurl(preview, { redactSecrets: true }), 'Copied as cURL (secrets masked)');
  };

  const update = <K extends keyof RequestDraft>(key: K, value: RequestDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const resetDraft = () => {
    setDraft(DEFAULT_DRAFT);
    setResponse(null);
    setError(null);
    setSavedId(null);
    setSavedName(null);
    setRequestTab('params');
  };

  const openSaved = (row: ApiRequestRow) => {
    setDraft(draftFromSaved(row));
    setSavedId(row.id);
    setSavedName(row.name);
    setResponse(null);
    setError(null);
  };

  const openHistory = (entry: HistoryEntry) => {
    setDraft(draftFromHistory(entry));
    setSavedId(null);
    setSavedName(entry.name ?? null);
    setResponse(null);
    setError(null);
  };

  const handleSave = async () => {
    const name = saveName.trim();
    if (!name) return;
    try {
      const id = await saveRequest.mutateAsync({
        id: savedId ?? undefined,
        name,
        collectionId: saveCollection === 'none' ? null : saveCollection,
        method: draft.method,
        url: draft.url,
        params: draft.params,
        headers: draft.headers,
        bodyMode: draft.bodyMode,
        body: draft.body,
        auth: draft.auth as unknown as Record<string, unknown>,
      });
      setSavedId(id);
      setSavedName(name);
      setSaveOpen(false);
      toast({ title: savedId ? 'Request updated' : 'Request saved', description: name });
    } catch (saveError) {
      toast({
        title: 'Could not save request',
        description: saveError instanceof Error ? saveError.message : 'Unknown error.',
        variant: 'destructive',
      });
    }
  };

  const openSaveDialog = () => {
    setSaveName(savedName ?? suggestName(draft.url));
    setSaveCollection('none');
    setSaveOpen(true);
  };

  const handleDeleteSaved = async (row: ApiRequestRow) => {
    try {
      await deleteRequest.mutateAsync(row.id);
      if (savedId === row.id) {
        setSavedId(null);
        setSavedName(null);
      }
      toast({ title: 'Request deleted', description: row.name });
    } catch (deleteError) {
      toast({
        title: 'Could not delete request',
        description: deleteError instanceof Error ? deleteError.message : 'Unknown error.',
        variant: 'destructive',
      });
    }
  };

  const handleCreateCollection = async () => {
    const name = collectionName.trim();
    if (!name) return;
    try {
      await createCollection.mutateAsync({ name });
      setCollectionOpen(false);
      setCollectionName('');
      toast({ title: 'Collection created', description: name });
    } catch (createError) {
      toast({
        title: 'Could not create collection',
        description: createError instanceof Error ? createError.message : 'Unknown error.',
        variant: 'destructive',
      });
    }
  };

  const filteredSaved = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return savedRequests;
    return savedRequests.filter(
      (row) =>
        row.name.toLowerCase().includes(q) ||
        row.url.toLowerCase().includes(q) ||
        row.method.toLowerCase().includes(q),
    );
  }, [savedRequests, search]);

  const filteredHistory = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return history;
    return history.filter(
      (entry) =>
        entry.url.toLowerCase().includes(q) || entry.method.toLowerCase().includes(q),
    );
  }, [history, search]);

  /* --------------------------------------------------------------- render */

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 px-3 py-2.5 sm:px-5">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="font-mono uppercase tracking-widest opacity-70">APIVue</span>
            <ChevronRight className="h-3 w-3 opacity-50" />
            <span className="text-foreground">Requests</span>
          </div>
          <h1 className="mt-0.5 text-base font-semibold tracking-tight">API request workspace</h1>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Select
            value={envId ?? 'none'}
            onValueChange={(value) => setEnvId(value === 'none' ? null : value)}
          >
            <SelectTrigger className="h-8 w-[170px] rounded-lg text-xs" aria-label="Environment">
              <Variable className="mr-1.5 h-3.5 w-3.5 shrink-0 opacity-70" />
              <SelectValue placeholder="No environment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No environment</SelectItem>
              {environments.map((env) => (
                <SelectItem key={env.id} value={env.id}>
                  {env.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 rounded-lg px-2.5 text-xs"
            onClick={() => setEnvOpen(true)}
          >
            <Variable className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Environments</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 rounded-lg px-2.5 text-xs text-muted-foreground"
            onClick={resetDraft}
            title="Start a blank request"
          >
            <Eraser className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </Button>
          <Button
            size="sm"
            className="h-8 gap-1.5 rounded-lg px-3 text-xs"
            onClick={openSaveDialog}
            disabled={!user}
          >
            <Save className="h-3.5 w-3.5" />
            {savedId ? 'Update' : 'Save'}
          </Button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[248px_minmax(0,1fr)]">
        {/* ---------------------------------------------------- sidebar */}
        <aside className="hidden min-h-0 flex-col border-r border-border/70 bg-card/30 lg:flex">
          <div className="flex items-center gap-1 border-b border-border/70 p-1.5">
            <button
              type="button"
              onClick={() => setLeftTab('collections')}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition-colors',
                leftTab === 'collections'
                  ? 'bg-accent font-medium text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Layers className="h-3.5 w-3.5" /> Saved
            </button>
            <button
              type="button"
              onClick={() => setLeftTab('history')}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition-colors',
                leftTab === 'history'
                  ? 'bg-accent font-medium text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <History className="h-3.5 w-3.5" /> History
            </button>
          </div>

          <div className="relative p-2">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={leftTab === 'collections' ? 'Search saved requests…' : 'Search history…'}
              className="h-8 rounded-lg pl-8 text-xs"
              aria-label="Search saved requests or history"
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3 scrollbar-thin">
            {leftTab === 'collections' ? (
              <>
                {!user ? (
                  <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                    Sign in to save requests and collections.
                  </p>
                ) : savedLoading ? (
                  <p className="px-2 py-6 text-center text-xs text-muted-foreground">Loading…</p>
                ) : filteredSaved.length === 0 ? (
                  <div className="px-2 py-6 text-center">
                    <Layers className="mx-auto h-5 w-5 text-muted-foreground/50" />
                    <p className="mt-2 text-xs font-medium">No saved requests</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                      Build a request and press Save. Group them into collections to stay organised.
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-0.5">
                    {filteredSaved.map((row) => (
                      <li key={row.id} className="group relative">
                        <button
                          type="button"
                          onClick={() => openSaved(row)}
                          className={cn(
                            'flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left transition-colors',
                            savedId === row.id
                              ? 'bg-accent'
                              : 'hover:bg-accent/60',
                          )}
                        >
                          <span
                            className={cn(
                              'mt-0.5 w-9 shrink-0 font-mono text-[10px] font-bold',
                              METHOD_TONE[row.method],
                            )}
                          >
                            {row.method}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-medium">{row.name}</span>
                            <span className="block truncate font-mono text-[10px] text-muted-foreground">
                              {summarizeUrl(row.url, 34)}
                            </span>
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteSaved(row)}
                          className="absolute right-1 top-1.5 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
                          aria-label={`Delete ${row.name}`}
                          title="Delete request"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {collections.length > 0 ? (
                  <div className="mt-3 border-t border-border/60 pt-2">
                    <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                      Collections
                    </p>
                    <ul className="space-y-0.5">
                      {collections.map((collection) => {
                        const count = savedRequests.filter(
                          (row) => row.collection_id === collection.id,
                        ).length;
                        return (
                          <li
                            key={collection.id}
                            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-muted-foreground"
                          >
                            <Star className="h-3 w-3 shrink-0" />
                            <span className="truncate">{collection.name}</span>
                            <span className="ml-auto font-mono text-[10px] opacity-70">{count}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}

                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 h-7 w-full justify-start gap-1.5 rounded-md px-2 text-[11px] text-muted-foreground hover:text-foreground"
                  onClick={() => setCollectionOpen(true)}
                  disabled={!user}
                >
                  <FolderPlus className="h-3.5 w-3.5" />
                  New collection
                </Button>
              </>
            ) : (
              <>
                {filteredHistory.length === 0 ? (
                  <div className="px-2 py-6 text-center">
                    <History className="mx-auto h-5 w-5 text-muted-foreground/50" />
                    <p className="mt-2 text-xs font-medium">No history yet</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                      Sent requests appear here, stored only in this browser. Credentials are never
                      recorded.
                    </p>
                  </div>
                ) : (
                  <>
                    <ul className="space-y-0.5">
                      {filteredHistory.map((entry) => (
                        <li key={entry.id} className="group relative">
                          <button
                            type="button"
                            onClick={() => openHistory(entry)}
                            className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-accent/60"
                          >
                            <span
                              className={cn(
                                'mt-0.5 w-9 shrink-0 font-mono text-[10px] font-bold',
                                METHOD_TONE[entry.method],
                              )}
                            >
                              {entry.method}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center gap-1.5">
                                <span className="truncate font-mono text-[10px] text-foreground/80">
                                  {summarizeUrl(entry.url, 30)}
                                </span>
                              </span>
                              <span className="mt-0.5 flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
                                {entry.status !== null ? (
                                  <span
                                    className={cn(
                                      'rounded border px-1',
                                      statusTone(entry.status),
                                    )}
                                  >
                                    {entry.status}
                                  </span>
                                ) : (
                                  <span className="rounded border border-destructive/30 px-1 text-destructive">
                                    failed
                                  </span>
                                )}
                                {entry.durationMs !== null ? (
                                  <span>{formatDuration(entry.durationMs)}</span>
                                ) : null}
                                <span className="ml-auto opacity-70">
                                  {new Date(entry.at).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </span>
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setHistory(removeHistoryEntry(entry.id))}
                            className="absolute right-1 top-1.5 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
                            aria-label="Remove history entry"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </li>
                      ))}
                    </ul>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 h-7 w-full justify-start gap-1.5 rounded-md px-2 text-[11px] text-muted-foreground hover:text-destructive"
                      onClick={() => setHistory(clearHistory())}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Clear history
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        </aside>

        {/* ------------------------------------------------------- main */}
        <div className="flex min-h-0 min-w-0 flex-col">
          {/* The sidebar is hidden on small screens; surface saved requests and
              history as a horizontally scrollable strip so the features are not
              desktop-only. */}
          <div className="flex items-center gap-1.5 overflow-x-auto border-b border-border/70 px-2.5 py-1.5 lg:hidden scrollbar-thin">
            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              Saved
            </span>
            {savedRequests.length === 0 ? (
              <span className="shrink-0 text-[11px] text-muted-foreground">
                Nothing saved yet
              </span>
            ) : (
              savedRequests.slice(0, 8).map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => openSaved(row)}
                  className={cn(
                    'shrink-0 rounded-full border px-2.5 py-1 text-[11px] transition-colors',
                    savedId === row.id
                      ? 'border-primary/40 bg-primary/10 text-foreground'
                      : 'border-border/70 text-muted-foreground hover:text-foreground',
                  )}
                >
                  <span className={cn('mr-1 font-mono text-[9px] font-bold', METHOD_TONE[row.method])}>
                    {row.method}
                  </span>
                  {row.name}
                </button>
              ))
            )}
            {history.length > 0 ? (
              <>
                <span className="ml-2 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  Recent
                </span>
                {history.slice(0, 4).map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => openHistory(entry)}
                    className="shrink-0 rounded-full border border-border/70 px-2.5 py-1 font-mono text-[10px] text-muted-foreground transition-colors hover:text-foreground"
                    title={entry.url}
                  >
                    {entry.status ?? 'ERR'} · {emptyRowLabel(entry)}
                  </button>
                ))}
              </>
            ) : null}
          </div>

          {/* URL bar */}
          <div className="border-b border-border/70 p-2.5 sm:p-3">
            <div className="flex items-stretch gap-1.5">
              <Select
                value={draft.method}
                onValueChange={(value) => {
                  const method = value as HttpMethod;
                  setDraft((current) => ({
                    ...current,
                    method,
                    bodyMode:
                      (method === 'GET' || method === 'HEAD') && current.bodyMode !== 'none'
                        ? 'none'
                        : current.bodyMode,
                  }));
                }}
              >
                <SelectTrigger
                  className={cn(
                    'h-10 w-[104px] shrink-0 rounded-lg font-mono text-xs font-bold',
                    METHOD_TONE[draft.method],
                  )}
                  aria-label="HTTP method"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HTTP_METHODS.map((method) => (
                    <SelectItem key={method} value={method} className="font-mono text-xs">
                      {method}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="relative min-w-0 flex-1">
                <Input
                  value={draft.url}
                  onChange={(event) => update('url', event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      void handleSend();
                    }
                  }}
                  placeholder="https://api.example.com/v1/users  or  {{base_url}}/users"
                  aria-label="Request URL"
                  spellCheck={false}
                  autoComplete="off"
                  className="h-10 rounded-lg pr-9 font-mono text-xs"
                />
                {draft.url ? (
                  <button
                    type="button"
                    onClick={() => update('url', '')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                    aria-label="Clear URL"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>

              {loading ? (
                <Button
                  variant="outline"
                  className="h-10 shrink-0 gap-1.5 rounded-lg px-4 text-xs"
                  onClick={handleCancel}
                >
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Cancel
                </Button>
              ) : (
                <Button
                  className="h-10 shrink-0 gap-1.5 rounded-lg px-4 text-xs font-semibold"
                  onClick={() => void handleSend()}
                  title="Send (Ctrl/Cmd + Enter)"
                >
                  <Send className="h-3.5 w-3.5" />
                  Send
                </Button>
              )}
            </div>

            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
              {activeEnvironment ? (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <Variable className="h-3 w-3" />
                  {activeEnvironment.name}
                  <span className="opacity-60">·</span>
                  <code className="font-mono">{resolvedPreview || '—'}</code>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setEnvOpen(true)}
                  className="inline-flex items-center gap-1 text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                >
                  <Variable className="h-3 w-3" />
                  Use {'{{variables}}'} — add an environment
                </button>
              )}
              {missing.length > 0 ? (
                <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <AlertCircle className="h-3 w-3" />
                  Undefined: {missing.map((name) => `{{${name}}}`).join(', ')}
                </span>
              ) : null}
              <button
                type="button"
                onClick={handleCopyCurl}
                className="ml-auto inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
              >
                {copiedKey ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                Copy as cURL
              </button>
            </div>
          </div>

          {/* Request config + response */}
          <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-2">
            <div className="flex min-h-0 flex-col border-b border-border/70 xl:border-b-0 xl:border-r">
              <Tabs
                value={requestTab}
                onValueChange={setRequestTab}
                className="flex min-h-0 flex-1 flex-col"
              >
                <div className="flex items-center justify-between border-b border-border/70 px-2.5 py-1.5">
                  <TabsList className="h-8 rounded-lg bg-muted/50 p-0.5">
                    <TabsTrigger value="params" className="h-7 rounded-md px-2.5 text-xs">
                      Params
                      {draft.params.filter((r) => r.enabled && r.key.trim()).length > 0 ? (
                        <span className="ml-1 rounded bg-background/70 px-1 font-mono text-[10px]">
                          {draft.params.filter((r) => r.enabled && r.key.trim()).length}
                        </span>
                      ) : null}
                    </TabsTrigger>
                    <TabsTrigger value="headers" className="h-7 rounded-md px-2.5 text-xs">
                      Headers
                      {draft.headers.filter((r) => r.enabled && r.key.trim()).length > 0 ? (
                        <span className="ml-1 rounded bg-background/70 px-1 font-mono text-[10px]">
                          {draft.headers.filter((r) => r.enabled && r.key.trim()).length}
                        </span>
                      ) : null}
                    </TabsTrigger>
                    <TabsTrigger value="body" className="h-7 rounded-md px-2.5 text-xs">
                      Body
                      {draft.bodyMode !== 'none' ? (
                        <span className="ml-1 h-1.5 w-1.5 rounded-full bg-primary" />
                      ) : null}
                    </TabsTrigger>
                    <TabsTrigger value="auth" className="h-7 rounded-md px-2.5 text-xs">
                      Auth
                      {draft.auth.mode !== 'none' ? (
                        <span className="ml-1 h-1.5 w-1.5 rounded-full bg-primary" />
                      ) : null}
                    </TabsTrigger>
                  </TabsList>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 rounded-md px-2 text-[11px] text-muted-foreground hover:text-foreground"
                    onClick={handleCopyCurl}
                  >
                    <Copy className="h-3 w-3" />
                    cURL
                  </Button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-3 scrollbar-thin">
                  <TabsContent value="params" className="m-0">
                    <KeyValueEditor
                      rows={draft.params}
                      onChange={(rows) => update('params', rows)}
                      keyPlaceholder="Query key"
                      valuePlaceholder="Query value"
                      addLabel="Add query param"
                      emptyHint="No query parameters."
                    />
                  </TabsContent>

                  <TabsContent value="headers" className="m-0">
                    <KeyValueEditor
                      rows={draft.headers}
                      onChange={(rows) => update('headers', rows)}
                      keyPlaceholder="Header"
                      valuePlaceholder="Value"
                      addLabel="Add header"
                      emptyHint="No custom headers."
                    />
                    <p className="mt-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
                      Some headers are controlled by the browser and cannot be overridden
                      (for example <code className="font-mono">Host</code>,
                      <code className="ml-1 font-mono">Origin</code> and
                      <code className="ml-1 font-mono">Content-Length</code>).
                    </p>
                  </TabsContent>

                  <TabsContent value="body" className="m-0 space-y-2">
                    {draft.method === 'GET' || draft.method === 'HEAD' ? (
                      <p className="rounded-lg border border-dashed border-border/70 px-3 py-6 text-center text-xs text-muted-foreground">
                        {draft.method} requests cannot include a body.
                      </p>
                    ) : (
                      <>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Select
                            value={draft.bodyMode}
                            onValueChange={(value) => update('bodyMode', value as BodyMode)}
                          >
                            <SelectTrigger className="h-8 w-[190px] rounded-lg text-xs" aria-label="Body type">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {BODY_MODES.filter((mode) => mode.value !== 'none').map((mode) => (
                                <SelectItem key={mode.value} value={mode.value} className="text-xs">
                                  {mode.label}
                                </SelectItem>
                              ))}
                              <SelectItem value="none" className="text-xs">
                                None
                              </SelectItem>
                            </SelectContent>
                          </Select>

                          {draft.bodyMode === 'json' ? (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 rounded-md px-2 text-[11px] text-muted-foreground hover:text-foreground"
                                onClick={() => {
                                  const pretty = prettifyJson(draft.body);
                                  if (pretty) update('body', pretty);
                                  else
                                    toast({
                                      title: 'Not valid JSON',
                                      description: 'Fix the syntax before formatting.',
                                      variant: 'destructive',
                                    });
                                }}
                              >
                                Format
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 rounded-md px-2 text-[11px] text-muted-foreground hover:text-foreground"
                                onClick={() => update('body', '')}
                              >
                                Clear
                              </Button>
                            </>
                          ) : null}
                        </div>

                        {draft.bodyMode === 'none' ? (
                          <p className="rounded-lg border border-dashed border-border/70 px-3 py-6 text-center text-xs text-muted-foreground">
                            This request will be sent without a body.
                          </p>
                        ) : (
                          <>
                            <Textarea
                              value={draft.body}
                              onChange={(event) => update('body', event.target.value)}
                              placeholder={
                                draft.bodyMode === 'json'
                                  ? '{\n  "name": "APIVue"\n}'
                                  : draft.bodyMode === 'x-www-form-urlencoded'
                                    ? 'key=value\nother=value'
                                    : 'Raw request body'
                              }
                              spellCheck={false}
                              aria-label="Request body"
                              className={cn(
                                'min-h-[220px] resize-y rounded-lg font-mono text-xs leading-relaxed',
                                jsonError && 'border-destructive/60 focus-visible:ring-destructive',
                              )}
                            />
                            {jsonError ? (
                              <p className="flex items-center gap-1.5 text-[11px] text-destructive">
                                <AlertCircle className="h-3 w-3" />
                                {jsonError}
                              </p>
                            ) : null}
                          </>
                        )}
                      </>
                    )}
                  </TabsContent>

                  <TabsContent value="auth" className="m-0 space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Authentication type</Label>
                      <Select
                        value={draft.auth.mode}
                        onValueChange={(value) =>
                          update('auth', { ...draft.auth, mode: value as AuthMode })
                        }
                      >
                        <SelectTrigger className="h-8 w-full max-w-[220px] rounded-lg text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {AUTH_MODES.map((mode) => (
                            <SelectItem key={mode.value} value={mode.value} className="text-xs">
                              {mode.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {draft.auth.mode === 'bearer' ? (
                      <div className="space-y-1.5">
                        <Label htmlFor="bearer-token" className="text-xs">
                          Token
                        </Label>
                        <Input
                          id="bearer-token"
                          type="password"
                          value={draft.auth.token ?? ''}
                          onChange={(event) =>
                            update('auth', { ...draft.auth, token: event.target.value })
                          }
                          placeholder="{{access_token}}"
                          spellCheck={false}
                          autoComplete="off"
                          className="h-8 rounded-lg font-mono text-xs"
                        />
                        <p className="text-[11px] text-muted-foreground">
                          Sent as <code className="font-mono">Authorization: Bearer …</code>
                        </p>
                      </div>
                    ) : null}

                    {draft.auth.mode === 'basic' ? (
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label htmlFor="basic-user" className="text-xs">
                            Username
                          </Label>
                          <Input
                            id="basic-user"
                            value={draft.auth.username ?? ''}
                            onChange={(event) =>
                              update('auth', { ...draft.auth, username: event.target.value })
                            }
                            autoComplete="off"
                            className="h-8 rounded-lg text-xs"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="basic-pass" className="text-xs">
                            Password
                          </Label>
                          <Input
                            id="basic-pass"
                            type="password"
                            value={draft.auth.password ?? ''}
                            onChange={(event) =>
                              update('auth', { ...draft.auth, password: event.target.value })
                            }
                            autoComplete="off"
                            className="h-8 rounded-lg text-xs"
                          />
                        </div>
                      </div>
                    ) : null}

                    {draft.auth.mode === 'api-key' ? (
                      <div className="space-y-2">
                        <div className="grid gap-2 sm:grid-cols-2">
                          <div className="space-y-1.5">
                            <Label htmlFor="apikey-name" className="text-xs">
                              Key name
                            </Label>
                            <Input
                              id="apikey-name"
                              value={draft.auth.apiKeyName ?? ''}
                              onChange={(event) =>
                                update('auth', { ...draft.auth, apiKeyName: event.target.value })
                              }
                              placeholder="X-API-Key"
                              autoComplete="off"
                              className="h-8 rounded-lg font-mono text-xs"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="apikey-value" className="text-xs">
                              Key value
                            </Label>
                            <Input
                              id="apikey-value"
                              type="password"
                              value={draft.auth.apiKeyValue ?? ''}
                              onChange={(event) =>
                                update('auth', { ...draft.auth, apiKeyValue: event.target.value })
                              }
                              placeholder="{{api_key}}"
                              autoComplete="off"
                              className="h-8 rounded-lg font-mono text-xs"
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-xs">Add to</Label>
                          <Select
                            value={draft.auth.apiKeyLocation ?? 'header'}
                            onValueChange={(value) =>
                              update('auth', {
                                ...draft.auth,
                                apiKeyLocation: value as 'header' | 'query',
                              })
                            }
                          >
                            <SelectTrigger className="h-8 w-[140px] rounded-lg text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="header" className="text-xs">
                                Header
                              </SelectItem>
                              <SelectItem value="query" className="text-xs">
                                Query string
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ) : null}

                    {draft.auth.mode === 'none' ? (
                      <p className="rounded-lg border border-dashed border-border/70 px-3 py-6 text-center text-xs text-muted-foreground">
                        No authentication will be attached to this request.
                      </p>
                    ) : null}

                    <p className="flex items-start gap-1.5 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
                      <Lock className="mt-0.5 h-3 w-3 shrink-0" />
                      Credentials stay in your browser. Saved requests and history never include
                      auth values you did not explicitly save, and cURL export masks them.
                    </p>
                  </TabsContent>
                </div>
              </Tabs>
            </div>

            <div className="flex min-h-0 flex-col p-2.5 sm:p-3">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Response
                </h2>
                {response ? (
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {new Date(response.receivedAt).toLocaleTimeString()}
                  </span>
                ) : null}
              </div>
              <div className="min-h-0 flex-1">
                <ResponseViewer
                  response={response}
                  error={error}
                  loading={loading}
                  onCopy={(value, label) => void copy(value, label)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------- dialogs */}
      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{savedId ? 'Update saved request' : 'Save request'}</DialogTitle>
            <DialogDescription>
              Saved requests are private to your account and protected by row-level security.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="save-name" className="text-xs">
                Name
              </Label>
              <Input
                id="save-name"
                value={saveName}
                onChange={(event) => setSaveName(event.target.value)}
                placeholder="List users"
                autoFocus
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void handleSave();
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Collection</Label>
              <Select value={saveCollection} onValueChange={setSaveCollection}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No collection</SelectItem>
                  {collections.map((collection) => (
                    <SelectItem key={collection.id} value={collection.id}>
                      {collection.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSaveOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleSave()}
              disabled={!saveName.trim() || saveRequest.isPending}
            >
              {saveRequest.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {savedId ? 'Update' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={collectionOpen} onOpenChange={setCollectionOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New collection</DialogTitle>
            <DialogDescription>
              Group related requests, for example "Payments API".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-1">
            <Label htmlFor="collection-name" className="text-xs">
              Collection name
            </Label>
            <Input
              id="collection-name"
              value={collectionName}
              onChange={(event) => setCollectionName(event.target.value)}
              placeholder="Payments API"
              autoFocus
              onKeyDown={(event) => {
                if (event.key === 'Enter') void handleCreateCollection();
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCollectionOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleCreateCollection()}
              disabled={!collectionName.trim() || createCollection.isPending}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EnvironmentDialog
        open={envOpen}
        onOpenChange={setEnvOpen}
        environments={environments}
        activeId={envId}
        onSelect={setEnvId}
      />
    </div>
  );
}

/** Short label for a history chip: last path segment or host. */
function emptyRowLabel(entry: HistoryEntry): string {
  try {
    const parsed = new URL(entry.url);
    const segment = parsed.pathname.split('/').filter(Boolean).pop();
    return segment ?? parsed.hostname;
  } catch {
    return entry.method;
  }
}

function suggestName(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return 'Untitled request';
  const withoutVariables = referencedVariables(trimmed).length
    ? trimmed.replace(/\{\{[^}]*\}\}/g, '')
    : trimmed;
  try {
    const parsed = new URL(
      /^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(withoutVariables)
        ? withoutVariables
        : `https://${withoutVariables}`,
    );
    const segment = parsed.pathname.split('/').filter(Boolean).pop();
    return segment ? `${parsed.hostname} · ${segment}` : parsed.hostname;
  } catch {
    return trimmed.slice(0, 60);
  }
}
