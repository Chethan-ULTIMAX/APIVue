/**
 * Turns Supabase auth failures into messages a person can act on.
 *
 * Supabase error strings are accurate but often opaque ("Email not confirmed",
 * "AuthApiError: ..."). Mapping them centrally keeps every screen consistent
 * and avoids leaking raw HTTP/stack details to the user.
 */

export interface FriendlyAuthError {
  message: string;
  /** Hint shown under the message, e.g. how to resolve the state. */
  hint?: string;
}

const NETWORK_HINT =
  'Check your internet connection. If the problem continues, the authentication service may be temporarily unavailable.';

export function friendlyAuthError(error: unknown): FriendlyAuthError {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : 'Something went wrong. Please try again.';
  const message = raw.toLowerCase();

  if (message.includes('invalid login credentials')) {
    return {
      message: 'That email and password combination is not correct.',
      hint: 'Double-check the password, or use “Forgot password?” to reset it.',
    };
  }

  if (message.includes('email not confirmed')) {
    return {
      message: 'This email address has not been confirmed yet.',
      hint: 'Open the confirmation link we emailed you, then sign in again. You can resend it below.',
    };
  }

  if (message.includes('user already registered') || message.includes('already registered')) {
    return {
      message: 'An account with this email already exists.',
      hint: 'Sign in instead, or reset the password if you have forgotten it.',
    };
  }

  if (message.includes('error sending confirmation') || message.includes('error sending recovery') || message.includes('rate limit')) {
    return {
      message: 'We could not send that email right now.',
      hint: 'Email sending is rate-limited. Please wait a few minutes and try again.',
    };
  }

  if (message.includes('password should be at least') || message.includes('weak password')) {
    return {
      message: 'That password is too short.',
      hint: 'Use at least 6 characters.',
    };
  }

  if (message.includes('same password')) {
    return { message: 'The new password must be different from the current one.' };
  }

  if (message.includes('signups not allowed') || message.includes('signup is disabled')) {
    return { message: 'New sign-ups are currently disabled for this project.' };
  }

  if (message.includes('redirect') && message.includes('not allowed')) {
    return {
      message: 'This site is not on the allowed redirect list.',
      hint: 'The Supabase project needs this origin added to its redirect allow list.',
    };
  }

  if (message.includes('failed to fetch') || message.includes('network') || message.includes('load failed')) {
    return { message: 'We could not reach the authentication service.', hint: NETWORK_HINT };
  }

  if (message.includes('session') && (message.includes('expired') || message.includes('missing'))) {
    return {
      message: 'Your session has expired.',
      hint: 'Sign in again to continue.',
    };
  }

  if (message.includes('jwt') || message.includes('token has expired')) {
    return { message: 'Your session is no longer valid.', hint: 'Sign in again to continue.' };
  }

  // Anything else: keep the original text but strip the class prefix noise.
  return { message: raw.replace(/^(AuthApiError|AuthError|AuthRetryableFetchError):\s*/i, '') };
}

export function isEmailNotConfirmed(error: unknown): boolean {
  const raw = error instanceof Error ? error.message : String(error);
  return raw.toLowerCase().includes('email not confirmed');
}
