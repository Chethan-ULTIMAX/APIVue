import { useEffect, useState } from 'react';
import { Eye, EyeOff, Loader2, Plus, Trash2, Variable } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Environment, EnvironmentVariable } from '@/lib/http/types';
import {
  useDeleteEnvironment,
  useSaveEnvironment,
  type ApiEnvironmentRow,
} from '@/hooks/use-api-workspace';

interface EnvironmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  environments: ApiEnvironmentRow[];
  activeId: string | null;
  onSelect: (id: string | null) => void;
}

const BLANK: Environment = {
  id: '',
  name: '',
  variables: [{ key: 'base_url', value: 'https://api.example.com', secret: false }],
};

export function EnvironmentDialog({
  open,
  onOpenChange,
  environments,
  activeId,
  onSelect,
}: EnvironmentDialogProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Environment>(BLANK);
  const [reveal, setReveal] = useState<Record<number, boolean>>({});

  const saveEnvironment = useSaveEnvironment();
  const deleteEnvironment = useDeleteEnvironment();

  useEffect(() => {
    if (!open) return;
    const existing = environments.find((env) => env.id === (activeId ?? selectedId));
    if (existing) {
      setSelectedId(existing.id);
      setDraft({ id: existing.id, name: existing.name, variables: existing.variables });
    } else {
      setSelectedId(null);
      setDraft(BLANK);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeId, environments.length]);

  const load = (row: ApiEnvironmentRow) => {
    setSelectedId(row.id);
    setDraft({ id: row.id, name: row.name, variables: row.variables });
    setReveal({});
  };

  const updateVariable = (index: number, patch: Partial<EnvironmentVariable>) => {
    setDraft((current) => ({
      ...current,
      variables: current.variables.map((variable, i) =>
        i === index ? { ...variable, ...patch } : variable,
      ),
    }));
  };

  const addVariable = () =>
    setDraft((current) => ({
      ...current,
      variables: [...current.variables, { key: '', value: '', secret: false }],
    }));

  const removeVariable = (index: number) =>
    setDraft((current) => ({
      ...current,
      variables: current.variables.filter((_, i) => i !== index),
    }));

  const handleSave = async () => {
    const name = draft.name.trim();
    if (!name) return;
    const variables = draft.variables
      .filter((variable) => variable.key.trim() !== '')
      .map((variable) => ({ ...variable, key: variable.key.trim() }));
    try {
      const id = await saveEnvironment.mutateAsync({
        id: draft.id || undefined,
        name,
        variables,
      });
      setSelectedId(id);
      setDraft((current) => ({ ...current, id, variables }));
      toast({ title: 'Environment saved', description: name });
    } catch (error) {
      toast({
        title: 'Could not save environment',
        description: error instanceof Error ? error.message : 'Unknown error.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!draft.id) return;
    try {
      await deleteEnvironment.mutateAsync(draft.id);
      if (activeId === draft.id) onSelect(null);
      setSelectedId(null);
      setDraft(BLANK);
      toast({ title: 'Environment deleted' });
    } catch (error) {
      toast({
        title: 'Could not delete environment',
        description: error instanceof Error ? error.message : 'Unknown error.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Variable className="h-4 w-4" /> Environments
          </DialogTitle>
          <DialogDescription>
            Reusable values such as <code className="font-mono">{'{{base_url}}'}</code> or{' '}
            <code className="font-mono">{'{{access_token}}'}</code>. Variables are private to your
            account.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-[170px_minmax(0,1fr)]">
          <div className="space-y-1">
            <p className="px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              Saved
            </p>
            {environments.length === 0 ? (
              <p className="px-1 py-2 text-[11px] text-muted-foreground">No environments yet.</p>
            ) : (
              environments.map((env) => (
                <button
                  key={env.id}
                  type="button"
                  onClick={() => load(env)}
                  className={cn(
                    'flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-xs transition-colors',
                    selectedId === env.id ? 'bg-accent font-medium' : 'hover:bg-accent/60',
                  )}
                >
                  <span className="truncate">{env.name}</span>
                  {activeId === env.id ? (
                    <span className="ml-auto rounded bg-primary/15 px-1 text-[9px] font-semibold uppercase text-primary">
                      active
                    </span>
                  ) : null}
                </button>
              ))
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-full justify-start gap-1.5 rounded-md px-2 text-[11px] text-muted-foreground hover:text-foreground"
              onClick={() => {
                setSelectedId(null);
                setDraft(BLANK);
                setReveal({});
              }}
            >
              <Plus className="h-3.5 w-3.5" /> New
            </Button>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="env-name" className="text-xs">
                Name
              </Label>
              <Input
                id="env-name"
                value={draft.name}
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                placeholder="Development"
                className="h-8 rounded-lg text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Variables</Label>
              <div className="space-y-1.5">
                {draft.variables.map((variable, index) => (
                  <div key={index} className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_auto] items-center gap-1.5">
                    <Input
                      value={variable.key}
                      onChange={(event) => updateVariable(index, { key: event.target.value })}
                      placeholder="base_url"
                      aria-label={`Variable name ${index + 1}`}
                      spellCheck={false}
                      className="h-8 rounded-md font-mono text-xs"
                    />
                    <div className="relative">
                      <Input
                        value={variable.value}
                        onChange={(event) => updateVariable(index, { value: event.target.value })}
                        type={variable.secret && !reveal[index] ? 'password' : 'text'}
                        placeholder="https://api.example.com"
                        aria-label={`Variable value ${index + 1}`}
                        spellCheck={false}
                        autoComplete="off"
                        className="h-8 rounded-md pr-8 font-mono text-xs"
                      />
                      {variable.secret ? (
                        <button
                          type="button"
                          onClick={() => setReveal((current) => ({ ...current, [index]: !current[index] }))}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                          aria-label={reveal[index] ? 'Hide value' : 'Reveal value'}
                        >
                          {reveal[index] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </button>
                      ) : null}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md text-muted-foreground hover:text-destructive"
                      onClick={() => removeVariable(index)}
                      aria-label={`Remove variable ${index + 1}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 rounded-md px-2 text-[11px] text-muted-foreground hover:text-foreground"
                onClick={addVariable}
              >
                <Plus className="h-3.5 w-3.5" /> Add variable
              </Button>
            </div>

            <label className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
              <Checkbox
                checked={draft.variables.some((variable) => variable.secret)}
                onCheckedChange={(checked) =>
                  setDraft((current) => ({
                    ...current,
                    variables: current.variables.map((variable) => ({
                      ...variable,
                      secret: checked === true,
                    })),
                  }))
                }
                className="h-3.5 w-3.5"
              />
              Mask all values (recommended for tokens)
            </label>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button
                size="sm"
                className="h-8 rounded-lg text-xs"
                onClick={() => void handleSave()}
                disabled={!draft.name.trim() || saveEnvironment.isPending}
              >
                {saveEnvironment.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                Save environment
              </Button>
              {draft.id ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-lg text-xs"
                    onClick={() => onSelect(activeId === draft.id ? null : draft.id)}
                  >
                    {activeId === draft.id ? 'Deactivate' : 'Use this environment'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 rounded-lg text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => void handleDelete()}
                    disabled={deleteEnvironment.isPending}
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
