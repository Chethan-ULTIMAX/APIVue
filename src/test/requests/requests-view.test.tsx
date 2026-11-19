import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * Component-level verification of the request workspace.
 *
 * The Supabase client and auth context are mocked so this runs without a
 * network or a real session, and `fetch` is stubbed so the assertions can
 * inspect exactly what APIVue would have sent.
 */

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ order: async () => ({ data: [], error: null }) }),
      }),
    }),
    auth: { getSession: async () => ({ data: { session: null } }) },
  },
}));

vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@example.test', name: 'Test' },
    loading: false,
    error: null,
    signIn: async () => undefined,
    signUp: async () => true,
    signOut: async () => undefined,
    resetPassword: async () => undefined,
    signInWithGoogle: async () => false,
    refreshSession: async () => undefined,
  }),
}));

import { RequestsView } from '@/features/requests/RequestsView';

function renderView(ui: ReactElement = <RequestsView />) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

type FetchMock = ReturnType<typeof vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>>;

function stubFetch(status = 201, payload: unknown = { ok: true }): FetchMock {
  const mock: FetchMock = vi.fn(async () =>
    new Response(JSON.stringify(payload), {
      status,
      statusText: status === 201 ? 'Created' : 'OK',
      headers: { 'Content-Type': 'application/json' },
    }),
  );
  vi.stubGlobal('fetch', mock);
  return mock;
}

describe('RequestsView', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders the URL bar, tabs and an empty response state', () => {
    stubFetch();
    renderView();
    expect(screen.getByLabelText('Request URL')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
    expect(screen.getByText('No response yet')).toBeInTheDocument();
    for (const name of [/params/i, /headers/i, /body/i, /auth/i]) {
      expect(screen.getByRole('tab', { name })).toBeInTheDocument();
    }
  });

  it('does not send when the URL is empty', async () => {
    const mock = stubFetch();
    renderView();
    fireEvent.click(screen.getByRole('button', { name: /send/i }));
    await waitFor(() => expect(mock).not.toHaveBeenCalled());
  });

  it('sends a GET request and renders the response', async () => {
    const mock = stubFetch(200, { users: [] });
    renderView();

    fireEvent.change(screen.getByLabelText('Request URL'), {
      target: { value: 'https://api.example.com/users' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => expect(mock).toHaveBeenCalledTimes(1));
    expect(mock.mock.calls[0][0]).toBe('https://api.example.com/users');
    expect((mock.mock.calls[0][1] as RequestInit).method).toBe('GET');

    expect(await screen.findByText(/200 OK/)).toBeInTheDocument();
  });

  it('surfaces an invalid URL as a friendly error and never calls fetch', async () => {
    const mock = stubFetch();
    renderView();

    fireEvent.change(screen.getByLabelText('Request URL'), { target: { value: 'not a url' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    expect(await screen.findByText('Invalid request')).toBeInTheDocument();
    expect(mock).not.toHaveBeenCalled();
  });

  it('records the request in local history', async () => {
    stubFetch(200, { ok: true });
    renderView();

    fireEvent.change(screen.getByLabelText('Request URL'), {
      target: { value: 'https://api.example.com/a' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));
    await screen.findByText(/200 OK/);

    fireEvent.click(screen.getByRole('button', { name: /history/i }));
    expect(screen.getByText(/api\.example\.com\/a/)).toBeInTheDocument();
  });

  it('switches the body tab and blocks bodies for GET', async () => {
    stubFetch();
    renderView();
    // Radix tabs activate on pointer down, so simulate the real interaction.
    const bodyTab = screen.getByRole('tab', { name: /body/i });
    fireEvent.mouseDown(bodyTab);
    fireEvent.click(bodyTab);
    expect(
      await screen.findByText(/requests cannot include a body/i),
    ).toBeInTheDocument();
  });

  it('shows an undefined-variable warning for unresolved placeholders', async () => {
    stubFetch();
    renderView();
    fireEvent.change(screen.getByLabelText('Request URL'), {
      target: { value: '{{base_url}}/users' },
    });
    expect(await screen.findByText(/Undefined:/)).toBeInTheDocument();
  });
});
