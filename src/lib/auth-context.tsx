/**
 * APIVue authentication context.
 *
 * Supabase owns the session. This provider deliberately waits for the
 * initial session lookup before protected routes can redirect, preventing
 * the common "logged in -> immediately sent to login" race.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/integrations/supabase/client';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  /** Returns true when Supabase created an active session immediately. */
  signUp: (email: string, password: string, name?: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  /**
   * Provider availability. Google OAuth must be enabled in the Supabase
   * project before the sign-in button can work, so the UI reads this instead
   * of offering a button that always fails.
   */
  providers: { google: boolean };
  refreshSession: () => Promise<void>;
  /** Re-send the signup confirmation email. */
  resendConfirmation: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

function mapUser(u: SupabaseUser): AuthUser {
  return {
    id: u.id,
    email: u.email ?? '',
    name:
      u.user_metadata?.full_name ||
      u.user_metadata?.name ||
      u.email?.split('@')[0],
  };
}

/* Redirect helpers are pure and live in their own module so importing them
 * does not drag in the Supabase client. They are imported here because the
 * provider calls `appUrl` itself, and re-exported so every existing
 * `@/lib/auth-context` import keeps working. */
import { appUrl, safeRedirectPath } from '@/lib/auth-url';
export { appUrl, safeRedirectPath };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /*
   * Supabase exposes the enabled external providers through the public auth
   * settings endpoint. Reading it once lets the login screen hide a Google
   * button that could only ever fail because the provider is not configured.
   */
  const [providers, setProviders] = useState<{ google: boolean }>({ google: false });
  useEffect(() => {
    let active = true;
    void fetch(`${SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY },
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((settings: { external?: Record<string, boolean> } | null) => {
        if (!active || !settings?.external) return;
        setProviders({ google: settings.external.google === true });
      })
      .catch(() => {
        // A failed lookup must never block email/password sign-in.
      });
    return () => {
      active = false;
    };
  }, []);

  const refreshSession = async () => {
    setError(null);
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      setUser(session?.user ? mapUser(session.user) : null);
    } catch (err) {
      setUser(null);
      setError(err instanceof Error ? err.message : 'Unable to read your session.');
      throw err;
    }
  };

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();
        if (!mounted) return;
        if (sessionError) throw sessionError;
        setUser(session?.user ? mapUser(session.user) : null);
        setError(null);
      } catch (err) {
        if (!mounted) return;
        setUser(null);
        setError(
          err instanceof Error ? err.message : 'Unable to restore your session.',
        );
      } finally {
        if (mounted) setLoading(false);
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUser(session?.user ? mapUser(session.user) : null);
      setError(null);
      setLoading(false);
    });

    void initialize();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) throw signInError;
  };

  const signUp = async (email: string, password: string, name?: string) => {
    const {
      data: { session },
      error: signUpError,
    } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: appUrl('/login'),
      },
    });
    if (signUpError) throw signUpError;
    return Boolean(session);
  };

  const signOut = async () => {
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) throw signOutError;
  };

  const resetPassword = async (email: string) => {
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: appUrl('/reset-password'),
    });
    if (resetError) throw resetError;
  };

  const resendConfirmation = async (email: string) => {
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: appUrl('/login') },
    });
    if (resendError) throw resendError;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        signIn,
        signUp,
        signOut,
        resetPassword,
        providers,
        refreshSession,
        resendConfirmation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
