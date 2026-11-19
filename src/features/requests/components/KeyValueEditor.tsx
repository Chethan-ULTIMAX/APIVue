import { Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import type { KeyValueRow } from '@/lib/http/types';
import { cn } from '@/lib/utils';

interface KeyValueEditorProps {
  rows: KeyValueRow[];
  onChange: (rows: KeyValueRow[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  addLabel?: string;
  /** Pairs that must stay in sync with another tab's list. */
  emptyHint?: string;
}

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function KeyValueEditor({
  rows,
  onChange,
  keyPlaceholder = 'Key',
  valuePlaceholder = 'Value',
  addLabel = 'Add row',
  emptyHint,
}: KeyValueEditorProps) {
  const update = (id: string, patch: Partial<KeyValueRow>) =>
    onChange(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));

  const remove = (id: string) => {
    const next = rows.filter((row) => row.id !== id);
    onChange(next.length ? next : [{ id: newId(), key: '', value: '', enabled: true }]);
  };

  const add = () => onChange([...rows, { id: newId(), key: '', value: '', enabled: true }]);

  return (
    <div className="space-y-1">
      {rows.length === 0 && emptyHint ? (
        <p className="rounded-xl border border-dashed border-border/70 px-3 py-6 text-center text-xs text-muted-foreground">
          {emptyHint}
        </p>
      ) : null}

      {/* Header row: labels line up with the input columns below. */}
      <div className="hidden grid-cols-[20px_minmax(0,1fr)_minmax(0,1.2fr)_28px] items-center gap-2 px-1 pb-1 sm:grid">
        <span className="sr-only">Enabled</span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/60">
          {keyPlaceholder}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/60">
          {valuePlaceholder}
        </span>
        <span className="sr-only">Actions</span>
      </div>

      {rows.map((row, index) => (
        <div
          key={row.id}
          className="group grid grid-cols-[20px_minmax(0,1fr)_minmax(0,1.2fr)_28px] items-center gap-2 rounded-md px-1 py-0.5 transition-colors hover:bg-surface-2/50"
        >
          <Checkbox
            checked={row.enabled}
            onCheckedChange={(checked) => update(row.id, { enabled: checked === true })}
            aria-label={`Enable ${keyPlaceholder.toLowerCase()} row ${index + 1}`}
            className="h-4 w-4"
          />
          <Input
            value={row.key}
            onChange={(event) => update(row.id, { key: event.target.value })}
            placeholder={keyPlaceholder}
            aria-label={`${keyPlaceholder} ${index + 1}`}
            spellCheck={false}
            autoComplete="off"
            className={cn(
              'h-8 rounded-md border-transparent bg-surface-2/60 font-mono text-xs focus-visible:border-input focus-visible:bg-background',
              !row.enabled && 'opacity-50',
            )}
          />
          <Input
            value={row.value}
            onChange={(event) => update(row.id, { value: event.target.value })}
            placeholder={valuePlaceholder}
            aria-label={`${valuePlaceholder} ${index + 1}`}
            spellCheck={false}
            autoComplete="off"
            className={cn(
              'h-8 rounded-md border-transparent bg-surface-2/60 font-mono text-xs focus-visible:border-input focus-visible:bg-background',
              !row.enabled && 'opacity-50',
            )}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="h-7 w-7 rounded-md text-muted-foreground/60 opacity-0 transition-opacity hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
            onClick={() => remove(row.id)}
            aria-label={`Remove ${keyPlaceholder.toLowerCase()} row ${index + 1}`}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </div>
      ))}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={add}
        className="mt-1 h-7 gap-1.5 rounded-md px-2 text-[11px] text-muted-foreground hover:text-foreground"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        {addLabel}
      </Button>
    </div>
  );
}
