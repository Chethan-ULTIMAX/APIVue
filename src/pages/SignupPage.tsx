import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff, Loader2, Lock, Mail, User } from 'lucide-react';

import { AuthExperience } from '@/components/AuthExperience';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/lib/auth-context';
import { friendlyAuthError } from '@/lib/auth-errors';
import { signInWithGoogleRedirect } from '@/lib/auth-oauth';

const MIN_PASSWORD_LENGTH = 6;

export function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<ReturnType<typeof friendlyAuthError> | null>(null);
  const [loading, setLoading] = useState(false);

  const { signUp, providers } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextParam = searchParams.get('next');
  const redirectTo = nextParam && /^\/(?!\/)/.test(nextParam) ? nextParam : '/dashboard';

  const passwordTooShort = password.length > 0 && password.length < MIN_PASSWORD_LENGTH;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError({ message: `Use at least ${MIN_PASSWORD_LENGTH} characters for your password.` });
      return;
    }

    setLoading(true);
    try {
      const hasSession = await signUp(email, password, name);
      if (hasSession) {
        // Email confirmation is disabled on this project: the user is signed in.
        navigate(redirectTo, { replace: true });
      } else {
        // Confirmation required. Tell the user rather than dumping them on a
        // sign-in form with no explanation.
        navigate(
          `/login?next=${encodeURIComponent(redirectTo)}&signup=confirm`,
          { replace: true },
        );
      }
    } catch (signUpError) {
      setError(friendlyAuthError(signUpError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthExperience
      mode="signup"
      title="Create your account"
      description="Bring your developer tools together and build a private, useful picture of your progress from day one."
      footer={
        <>
          Already have an account?{' '}
          <Link
            to={nextParam ? `/login?next=${encodeURIComponent(nextParam)}` : '/login'}
            className="font-semibold text-primary transition hover:text-primary/80"
          >
            Sign in
          </Link>
        </>
      }
    >
      <div className="space-y-5">
        {error ? (
          <Alert variant="destructive" className="animate-card-reveal">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <span className="font-medium">{error.message}</span>
              {error.hint ? (
                <span className="mt-1 block text-xs opacity-90">{error.hint}</span>
              ) : null}
            </AlertDescription>
          </Alert>
        ) : null}

        {providers.google ? (
          <Button
            type="button"
            variant="outline"
            className="auth-google-button group h-12 w-full gap-3 rounded-xl bg-background/70"
            onClick={() => void signInWithGoogleRedirect(redirectTo)}
            disabled={loading}
          >
            <span>Sign up with Google</span>
          </Button>
        ) : null}

        <div className="relative py-1">
          <div className="absolute inset-0 flex items-center">
            <Separator />
          </div>
          <div className="relative flex justify-center text-[10px] font-semibold uppercase tracking-[0.18em]">
            <span className="bg-card px-3 text-muted-foreground">Create with email</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <div className="auth-input-wrap">
              <User className="auth-input-icon" />
              <Input
                id="name"
                placeholder="Your name"
                className="auth-input pl-10"
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="auth-input-wrap">
              <Mail className="auth-input-icon" />
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                className="auth-input pl-10"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="auth-input-wrap">
              <Lock className="auth-input-icon" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a password"
                className="auth-input pl-10 pr-11"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={MIN_PASSWORD_LENGTH}
                aria-invalid={passwordTooShort}
                aria-describedby="password-requirement"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="auth-password-toggle focus-ring"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {/* Real three-step strength meter instead of a decorative bar. */}
            <div className="flex items-center gap-2 pt-1" id="password-requirement">
              <div
                className="h-1 flex-1 overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={3}
                aria-valuenow={
                  password.length === 0 ? 0 : password.length < MIN_PASSWORD_LENGTH ? 1 : password.length < 10 ? 2 : 3
                }
                aria-label="Password strength"
              >
                <div
                  className={
                    'h-full rounded-full transition-all duration-300 ' +
                    (password.length < MIN_PASSWORD_LENGTH
                      ? 'w-1/3 bg-rose-500'
                      : password.length < 10
                        ? 'w-2/3 bg-amber-500'
                        : 'w-full bg-emerald-500')
                  }
                />
              </div>
              <p
                className={
                  'text-[11px] ' + (passwordTooShort ? 'text-destructive' : 'text-muted-foreground')
                }
              >
                {password.length === 0
                  ? `At least ${MIN_PASSWORD_LENGTH} characters`
                  : passwordTooShort
                    ? `${MIN_PASSWORD_LENGTH - password.length} more characters needed`
                    : password.length < 10
                      ? 'Good — add more characters for a stronger password'
                      : 'Strong password'}
              </p>
            </div>
          </div>

          <Button
            type="submit"
            className="auth-submit-button h-12 w-full rounded-xl text-sm font-semibold shadow-lg shadow-primary/20"
            disabled={loading}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {loading ? 'Creating account…' : 'Create account'}
          </Button>

          <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
            We will email you a confirmation link. Your APIVue data is private to your account.
          </p>
        </form>
      </div>
    </AuthExperience>
  );
}
