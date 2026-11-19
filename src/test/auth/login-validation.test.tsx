import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/**
 * Login validation and error feedback.
 *
 * Covers the specific behaviour the visual pass added: the inline email error
 * appears only after blur, is wired to the input through aria-describedby, and
 * never blocks a password-auth submit. The Supabase calls are mocked, so this
 * asserts APIVue's own logic, not the provider's.
 */

const signIn = vi.fn(async (_email: string, _password: string) => undefined);
const resendConfirmation = vi.fn(async (_email: string) => undefined);

vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({
    signIn,
    resendConfirmation,
    providers: { google: false },
    user: null,
    loading: false,
  }),
}));

vi.mock('@/lib/theme-context', () => ({
  useTheme: () => ({ theme: 'dark', toggleTheme: vi.fn() }),
}));

import { LoginPage } from '@/pages/LoginPage';

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <LoginPage />
    </MemoryRouter>,
  );
}

describe('LoginPage validation', () => {
  it('shows no error before the field is touched', () => {
    renderLogin();
    expect(screen.queryByText(/complete email address/i)).not.toBeInTheDocument();
  });

  it('reports an incomplete address on blur and wires it to the input', () => {
    renderLogin();
    const email = screen.getByLabelText(/email/i);

    fireEvent.change(email, { target: { value: 'not-an-email' } });
    fireEvent.blur(email);

    const error = screen.getByText(/complete email address/i);
    expect(error).toBeInTheDocument();
    expect(email).toHaveAttribute('aria-invalid', 'true');
    const describedBy = email.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy as string)).toBe(error);
  });

  it('clears the error once the address becomes valid', () => {
    renderLogin();
    const email = screen.getByLabelText(/email/i);

    fireEvent.change(email, { target: { value: 'bad' } });
    fireEvent.blur(email);
    expect(screen.getByText(/complete email address/i)).toBeInTheDocument();

    fireEvent.change(email, { target: { value: 'dev@example.com' } });
    expect(screen.queryByText(/complete email address/i)).not.toBeInTheDocument();
    expect(email).not.toHaveAttribute('aria-invalid');
  });

  it('trims the address before calling signIn', async () => {
    signIn.mockClear();
    renderLogin();

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: '  dev@example.com  ' },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'correct-horse' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => expect(signIn).toHaveBeenCalledWith('dev@example.com', 'correct-horse'));
  });

  it('exposes the password toggle state to assistive technology', () => {
    renderLogin();
    const toggle = screen.getByRole('button', { name: /show password/i });
    const password = screen.getByLabelText(/^password$/i);

    expect(password).toHaveAttribute('type', 'password');
    expect(toggle).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(toggle);

    expect(password).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: /hide password/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
