import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { ResponseViewer } from '@/features/requests/components/ResponseViewer';
import { HttpRequestError } from '@/lib/http/types';
import type { ResponseResult } from '@/lib/http/types';

/**
 * The response inspector is the part of the workspace users stare at most, so
 * these assertions cover the things the redesign claimed: JSON is tokenised
 * (not just dumped), status/time/size are present, and the failure states are
 * genuinely distinguishable — success, HTTP error, network error.
 */

function jsonResponse(overrides: Partial<ResponseResult> = {}): ResponseResult {
  return {
    status: 200,
    statusText: 'OK',
    headers: [
      ['content-type', 'application/json; charset=utf-8'],
      ['cache-control', 'no-store'],
    ],
    bodyText: '{"ok":true,"count":12,"name":"apivue","items":[],"nothing":null}',
    json: { ok: true, count: 12, name: 'apivue', items: [], nothing: null },
    isJson: true,
    contentType: 'application/json; charset=utf-8',
    sizeBytes: 68,
    durationMs: 143,
    redirected: false,
    truncated: false,
    ok: true,
    finalUrl: 'https://api.example.com/users',
    ...overrides,
  } as ResponseResult;
}

describe('ResponseViewer', () => {
  it('renders status, timing and size for a successful response', () => {
    render(<ResponseViewer response={jsonResponse()} error={null} loading={false} onCopy={vi.fn()} />);

    expect(screen.getByText(/200 OK/)).toBeInTheDocument();
    expect(screen.getByText('143 ms')).toBeInTheDocument();
    expect(screen.getByText('68 B')).toBeInTheDocument();
    expect(screen.getByText(/Valid JSON/)).toBeInTheDocument();
  });

  it('syntax-highlights JSON keys, strings, numbers and literals', () => {
    const { container } = render(
      <ResponseViewer response={jsonResponse()} error={null} loading={false} onCopy={vi.fn()} />,
    );

    // Each token class must appear in the rendered body, proving the tokenizer
    // ran rather than the plain-text fallback being used.
    expect(container.querySelectorAll('.tok-key').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('.tok-string').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('.tok-number').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('.tok-boolean').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('.tok-null').length).toBeGreaterThan(0);

    // The raw JSON text is still fully present (nothing lost to highlighting).
    expect(container.textContent).toContain('"count": 12');
  });

  it('shows an in-flight state with no fabricated numbers', () => {
    render(<ResponseViewer response={null} error={null} loading onCopy={vi.fn()} />);

    expect(screen.getByText(/Sending request/)).toBeInTheDocument();
    expect(screen.queryByText(/\d+ (ms|B)/)).not.toBeInTheDocument();
    expect(screen.getByText(/cancel at any time/i)).toBeInTheDocument();
  });

  it('distinguishes an HTTP error response from a network failure', () => {
    const { unmount } = render(
      <ResponseViewer
        response={jsonResponse({ status: 404, statusText: 'Not Found' })}
        error={null}
        loading={false}
        onCopy={vi.fn()}
      />,
    );
    // An HTTP error is still a response: the status is shown, not an error panel.
    expect(screen.getByText(/404 Not Found/)).toBeInTheDocument();
    unmount();

    render(
      <ResponseViewer
        response={null}
        error={new HttpRequestError('network', 'Failed to fetch')}
        loading={false}
        onCopy={vi.fn()}
      />,
    );
    expect(screen.getByText('Network problem')).toBeInTheDocument();
    expect(screen.getByText(/About CORS/)).toBeInTheDocument();
  });

  it('renders non-JSON bodies as text and says so', () => {
    render(
      <ResponseViewer
        response={jsonResponse({
          bodyText: 'hello world',
          json: null,
          isJson: false,
          contentType: 'text/plain',
        })}
        error={null}
        loading={false}
        onCopy={vi.fn()}
      />,
    );
    expect(screen.getByText(/Not JSON/)).toBeInTheDocument();
    expect(screen.getByText('hello world')).toBeInTheDocument();
  });

  it('copies the formatted body through the callback', async () => {
    const onCopy = vi.fn();
    render(<ResponseViewer response={jsonResponse()} error={null} loading={false} onCopy={onCopy} />);

    fireEvent.click(screen.getByRole('button', { name: /copy body/i }));
    await waitFor(() => expect(onCopy).toHaveBeenCalledTimes(1));

    const [value, label] = onCopy.mock.calls[0];
    expect(label).toBe('Response body copied');
    expect(JSON.parse(value)).toMatchObject({ ok: true, count: 12 });
  });
});
