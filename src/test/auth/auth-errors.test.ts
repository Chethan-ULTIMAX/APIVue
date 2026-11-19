import { describe, expect, it } from 'vitest';

import { friendlyAuthError, isEmailNotConfirmed } from '@/lib/auth-errors';
import { appUrl, safeRedirectPath } from '@/lib/auth-context';

describe('friendlyAuthError', () => {
  it('explains bad credentials without exposing the raw API string', () => {
    const result = friendlyAuthError(new Error('Invalid login credentials'));
    expect(result.message).toMatch(/not correct/i);
    expect(result.hint).toMatch(/forgot password/i);
  });

  it('detects an unconfirmed email and offers a next step', () => {
    const result = friendlyAuthError(new Error('Email not confirmed'));
    expect(result.message).toMatch(/not been confirmed/i);
    expect(result.hint).toMatch(/confirmation link/i);
  });

  it('detects an existing account on signup', () => {
    expect(friendlyAuthError(new Error('User already registered')).message).toMatch(
      /already exists/i,
    );
  });

  it('explains mailer rate limits', () => {
    const result = friendlyAuthError(new Error('Error sending confirmation email'));
    expect(result.message).toMatch(/could not send that email/i);
    expect(result.hint).toMatch(/rate-limited/i);
  });

  it('explains a redirect that is not allow-listed', () => {
    expect(
      friendlyAuthError(new Error('requested path is invalid: redirect_to not allowed'))
        .message,
    ).toMatch(/redirect list/i);
  });

  it('explains network failures', () => {
    expect(friendlyAuthError(new TypeError('Failed to fetch')).message).toMatch(
      /could not reach/i,
    );
  });

  it('strips Supabase class prefixes for unknown errors', () => {
    expect(friendlyAuthError(new Error('AuthApiError: Something odd')).message).toBe(
      'Something odd',
    );
  });

  it('handles non-Error values', () => {
    expect(friendlyAuthError('plain string error').message).toBe('plain string error');
    expect(friendlyAuthError(undefined).message).toMatch(/went wrong/i);
  });

  it('detects unconfirmed emails for the resend affordance', () => {
    expect(isEmailNotConfirmed(new Error('Email not confirmed'))).toBe(true);
    expect(isEmailNotConfirmed(new Error('Invalid login credentials'))).toBe(false);
  });
});

describe('redirect safety', () => {
  it('accepts same-origin absolute paths', () => {
    expect(safeRedirectPath('/dashboard/requests')).toBe('/dashboard/requests');
  });

  it('rejects protocol-relative and absolute URLs', () => {
    expect(safeRedirectPath('//evil.test')).toBe('/dashboard');
    expect(safeRedirectPath('https://evil.test')).toBe('/dashboard');
    expect(safeRedirectPath(undefined)).toBe('/dashboard');
  });

  it('builds an absolute app URL that includes the deployment base', () => {
    const url = appUrl('/login');
    expect(url.startsWith(window.location.origin)).toBe(true);
    expect(url.endsWith('/login')).toBe(true);
  });
});
