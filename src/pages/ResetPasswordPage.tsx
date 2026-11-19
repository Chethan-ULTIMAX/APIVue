import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
} from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { friendlyAuthError } from '@/lib/auth-errors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';

/* ============================================================
 * Reset password
 *
 * Supabase's recovery emails land on /reset-password. This page
 * only renders once Supabase emits the PASSWORD_RECOVERY event
 * (which happens when the recovery link token is processed).
 * Without a recovery session it redirects to /forgot-password.
 * ============================================================ */

export function ResetPasswordPage() {
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [checking, setChecking] = useState(true);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<{ message: string; hint?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  /* ---------- Detect the recovery session ---------- */

  useEffect(() => {
    let settled = false;
    let mounted = true;

    const finish = (ready: boolean) => {
      if (!mounted || settled) return;
      settled = true;
      clearTimeout(timeout);
      setRecoveryReady(ready);
      setChecking(false);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') finish(true);
    });

    // If Supabase never reports a recovery session, this is not a
    // password-recovery visit — send the user back to the reset
    // request form.
    const timeout = setTimeout(() => finish(false), 3000);

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!checking && !recoveryReady) {
      navigate('/forgot-password', { replace: true });
    }
  }, [checking, recoveryReady, navigate]);

  /* ---------- Submit ---------- */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError({ message: 'Password must be at least 6 characters.' });
      return;
    }
    if (password !== confirmPassword) {
      setError({ message: 'The two passwords do not match.' });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      toast({
        title: 'Password updated',
        description: 'Sign in with your new password.',
      });
      navigate('/login', { replace: true });
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  /* ---------- External link when no recovery session ---------- */

  if (checking) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-background p-4">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsl(var(--primary)/.07),transparent_32rem)]"
          aria-hidden="true"
        />
        <Card className="relative w-full max-w-md border-border/80 shadow-elev-lg">
          <CardContent className="p-8 text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              Checking your recovery session…
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!recoveryReady) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-background p-4">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsl(var(--primary)/.07),transparent_32rem)]"
          aria-hidden="true"
        />
        <Card className="relative w-full max-w-md border-border/80 shadow-elev-lg">
          <CardContent className="p-8 text-center">
            <AlertCircle className="mx-auto h-6 w-6 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              This link is only valid from a password-recovery email.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ---------- Form ---------- */

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background p-4">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsl(var(--primary)/.07),transparent_32rem)]"
        aria-hidden="true"
      />
      <Card className="animate-enter-up relative w-full max-w-md border-border/80 shadow-elev-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="mb-2 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
              <KeyRound className="h-6 w-6 text-primary" aria-hidden="true" />
            </div>
          </div>

          <CardTitle className="text-2xl font-semibold tracking-tight">Set a new password</CardTitle>
          <CardDescription>
            Choose a strong password for your APIVue account.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive" className="animate-enter-sm">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <span className="font-medium">{error.message}</span>
                  {error.hint ? <span className="mt-1 block text-xs opacity-90">{error.hint}</span> : null}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="At least 6 characters"
                  className="h-11 pl-9 pr-10"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground focus-ring"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Repeat your new password"
                  className="h-11 pl-9"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="h-11 w-full font-semibold" disabled={loading} aria-busy={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              {loading ? 'Updating…' : 'Update password'}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Remember your password?{' '}
              <Link to="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}