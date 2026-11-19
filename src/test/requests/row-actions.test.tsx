import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { KeyValueEditor } from '@/features/requests/components/KeyValueEditor';
import type { KeyValueRow } from '@/lib/http/types';

/**
 * Regression guard for a real defect found during visual QA.
 *
 * The row-delete control was `opacity-0` with only a `group-hover` reveal, so on
 * a touch device — where hover never fires — it was permanently invisible and
 * the row could not be removed. The fix keeps the hover reveal from `sm` up
 * (where a pointer exists) and shows the control unconditionally below it.
 *
 * jsdom cannot evaluate media queries, so this asserts the class contract
 * rather than computed opacity. That is exactly the fact that regressed.
 */

const row: KeyValueRow = { id: 'r1', key: 'Accept', value: 'application/json', enabled: true };

function setup() {
  const onChange = vi.fn();
  render(
    <KeyValueEditor
      rows={[row]}
      onChange={onChange}
      keyPlaceholder="Header"
      valuePlaceholder="Value"
      addLabel="Add header"
    />,
  );
  return { onChange };
}

describe('KeyValueEditor row actions', () => {
  it('keeps the remove control reachable without hover on small screens', () => {
    setup();
    const remove = screen.getByRole('button', { name: /remove header row 1/i });

    const classes = remove.className;
    // Visible by default ...
    expect(classes).toContain('opacity-100');
    // ... and only hidden once a pointing device is assumed.
    expect(classes).toContain('sm:opacity-0');
    expect(classes).toContain('sm:group-hover:opacity-100');
    expect(classes).toContain('focus-visible:opacity-100');
  });

  it('still removes the row and never leaves the list empty', () => {
    const { onChange } = setup();
    fireEvent.click(screen.getByRole('button', { name: /remove header row 1/i }));

    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0][0] as KeyValueRow[];
    expect(next).toHaveLength(1);
    expect(next[0].key).toBe('');
  });

  it('edits a value through the row input', () => {
    const { onChange } = setup();
    fireEvent.change(screen.getByLabelText(/value 1/i), { target: { value: 'text/plain' } });

    const next = onChange.mock.calls[0][0] as KeyValueRow[];
    expect(next[0].value).toBe('text/plain');
  });
});
