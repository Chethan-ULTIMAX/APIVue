import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

/**
 * Behavioural checks for the interactions the visual pass introduced.
 *
 * These are NOT screenshot tests — jsdom has no layout engine, so nothing here
 * can prove spacing, colour rendering or the feel of an animation. What they do
 * prove is that the controls actually do what the redesign claims: the palette
 * opens on the shortcut, searches, navigates, and exposes real actions; the
 * sidebar marks the current route; nothing renders a dead control.
 */

/**
 * The sidebar reads the user's avatar through `supabase.from('profiles')…` and
 * signs it through `supabase.storage…`. Mocking the client module means the
 * component under test runs its real code path while the query and the signed
 * URL are answered locally — no network, and no dependency on the
 * VITE_SUPABASE_* environment being present (the real module throws at import
 * time when it is not, which is exactly how CI failed).
 */
// `vi.mock` factories are hoisted above imports, so the spies they close over
// must be hoisted too — otherwise they are read before initialisation.
const { profileQuery, storageUrl } = vi.hoisted(() => ({
  profileQuery: vi.fn(),
  storageUrl: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      // Mirrors the builder used in AppSidebar:
      //   from('profiles').select('avatar_url').eq('id', id).maybeSingle()
      const builder = {
        select: () => builder,
        eq: () => builder,
        maybeSingle: () => {
          profileQuery(table);
          return Promise.resolve({ data: { avatar_url: null }, error: null });
        },
      };
      return builder;
    },
    storage: {
      from: (bucket: string) => ({
        createSignedUrl: (path: string, expiresIn: number) => {
          storageUrl(bucket, path, expiresIn);
          return Promise.resolve({ data: { signedUrl: null }, error: null });
        },
      }),
    },
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      signOut: () => Promise.resolve({ error: null }),
    },
  },
}));

vi.mock('@/lib/theme-context', () => ({
  useTheme: () => ({ theme: 'dark', toggleTheme: vi.fn(), setTheme: vi.fn() }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const signOut = vi.fn(async () => undefined);
vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({
    user: { id: 'u1', email: 'dev@example.test', name: 'Dev' },
    loading: false,
    signOut,
    providers: { google: false },
  }),
}));

vi.mock('@/features/requests/RequestsView', () => ({
  RequestsView: () => <div>requests-view</div>,
}));

import { DashboardLayout } from '@/components/DashboardLayout';

function renderLayout(initial = '/dashboard') {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<div>overview-view</div>} />
          <Route path="requests" element={<div>requests-route</div>} />
          <Route path="goals" element={<div>goals-route</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('dashboard shell interactions', () => {
  beforeEach(() => {
    signOut.mockClear();
    profileQuery.mockClear();
    storageUrl.mockClear();
    window.localStorage.clear();
  });

  it('answers the sidebar avatar lookup locally, with no network request', async () => {
    // A real fetch would mean the Supabase module was not actually replaced.
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    renderLayout('/dashboard/requests');
    await screen.findByText('requests-route');

    // The sidebar queried the mocked client ...
    await waitFor(() => expect(profileQuery).toHaveBeenCalledWith('profiles'));
    // ... it never needed a signed URL, because the user has no avatar ...
    expect(storageUrl).not.toHaveBeenCalled();
    // ... and nothing went out over the wire.
    expect(fetchSpy).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
  });

  it('opens the command palette with the keyboard shortcut', async () => {
    renderLayout();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'k', metaKey: true });

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByLabelText('Command palette search')).toBeInTheDocument();
  });

  it('opens from the header button and closes with Escape', async () => {
    renderLayout();
    fireEvent.click(screen.getByRole('button', { name: /search dashboard pages and actions/i }));
    await screen.findByRole('dialog');

    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('lists every dashboard destination and filters with a real search', async () => {
    renderLayout();
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    await screen.findByRole('dialog');

    // All 11 routes are present before typing. Scope to the listbox: the
    // sidebar also renders these labels, and it is not inside the dialog.
    const listbox = screen.getByRole('listbox');
    for (const label of ['Requests', 'Dashboard', 'Progress', 'Analytics', 'Compare',
      'AI Insights', 'Profiles', 'Explore', 'Integrations', 'Goals', 'Settings']) {
      expect(within(listbox).getByRole('option', { name: label })).toBeInTheDocument();
    }

    fireEvent.change(screen.getByLabelText('Command palette search'), {
      target: { value: 'goal' },
    });
    await waitFor(() => {
      const list = screen.getByRole('listbox');
      expect(within(list).getByRole('option', { name: 'Goals' })).toBeInTheDocument();
      expect(within(list).queryByRole('option', { name: 'Analytics' })).not.toBeInTheDocument();
    });
  });

  it('navigates to the chosen page and closes the palette', async () => {
    renderLayout();
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    await screen.findByRole('dialog');

    fireEvent.change(screen.getByLabelText('Command palette search'), {
      target: { value: 'goals' },
    });
    const option = await within(screen.getByRole('listbox')).findByRole('option', {
      name: 'Goals',
    });
    fireEvent.click(option);

    expect(await screen.findByText('goals-route')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('exposes sign-out as a real action, not a decorative row', async () => {
    renderLayout();
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    await screen.findByRole('dialog');

    fireEvent.click(screen.getByRole('option', { name: /sign out/i }));
    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
  });

  it('marks the active sidebar item for the current route', async () => {
    renderLayout('/dashboard/requests');
    await screen.findByText('requests-route');

    const link = screen.getByRole('link', { name: /requests/i });
    expect(link).toHaveAttribute('data-active', 'true');
    expect(link).toHaveAttribute('aria-current', 'page');

    // A different destination must not claim to be current.
    const goals = screen.getByRole('link', { name: /goals/i });
    expect(goals).toHaveAttribute('data-active', 'false');
    expect(goals).not.toHaveAttribute('aria-current');
  });

  it('announces route changes to assistive technology', async () => {
    const { container } = renderLayout('/dashboard/requests');
    await screen.findByText('requests-route');
    const status = container.querySelector('[role="status"][aria-live="polite"]');
    expect(status?.textContent).toContain('Requests');
  });
});
