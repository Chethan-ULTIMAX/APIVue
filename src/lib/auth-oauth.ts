/**
 * Google OAuth entry point.
 *
 * Extracted from the auth context so the provider can be loaded lazily and so
 * the redirect target stays base-path aware. Callers must check
 * `useAuth().providers.google` first — offering a button for a disabled
 * provider is a dead end for the user.
 */

import { supabase } from '@/integrations/supabase/client';
import { appUrl, safeRedirectPath } from '@/lib/auth-context';

export async function signInWithGoogleRedirect(redirectPath?: string): Promise<void> {
  const target = safeRedirectPath(redirectPath);
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: appUrl(target),
      queryParams: { prompt: 'select_account' },
    },
  });
  if (error) throw error;
}
