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
    <div className="space-y-1.5">
      {rows.length === 0 && emptyHint ? (
        <p className="rounded-lg border border-dashed border-border/70 px-3 py-6 text-center text-xs text-muted-foreground">
          {emptyHint}
        </p>
      ) : null}

      <div className="grid grid-cols-[24px_minmax(0,1fr)_minmax(0,1.2fr)_32px] items-center gap-2 px-1">
        <span className="sr-only">Enabled</span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          {keyPlaceholder}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          {valuePlaceholder}
        </span>
        <span className="sr-only">Actions</span>
      </div>

      {rows.map((row, index) => (
        <div
          key={row.id}
          className="grid grid-cols-[24px_minmax(0,1fr)_minmax(0,1.2fr)_32px] items-center gap-2"
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
              'h-8 rounded-md font-mono text-xs',
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
              'h-8 rounded-md font-mono text-xs',
              !row.enabled && 'opacity-50',
            )}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-md text-muted-foreground hover:text-destructive"
            onClick={() => remove(row.id)}
            aria-label={`Remove ${keyPlaceholder.toLowerCase()} row ${index + 1}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={add}
        className="mt-1 h-7 gap-1.5 rounded-md px-2 text-xs text-muted-foreground hover:text-foreground"
      >
        <Plus className="h-3.5 w-3.5" />
        {addLabel}
      </Button>
    </div>
  );
}
