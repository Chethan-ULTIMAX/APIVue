import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react';

import { AuthExperience } from '@/components/AuthExperience';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/lib/auth-context';

function GoogleIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { signIn, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextParam = searchParams.get('next');
  const redirectTo = nextParam && /^\/(?!\/)/.test(nextParam) ? nextParam : '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signIn(email, password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle(redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed. Please try again.');
      setGoogleLoading(false);
    }
  };

  const busy = loading || googleLoading;

  return (
    <AuthExperience
      mode="signin"
      title="Welcome back"
      description="Sign in to pick up your developer progress, connected profiles, goals, and insights right where you left them."
      footer={<>Don&apos;t have an account? <Link to={nextParam ? `/signup?next=${encodeURIComponent(nextParam)}` : '/signup'} className="font-semibold text-primary transition hover:text-primary/80">Create one</Link></>}
    >
      <div className="space-y-5">
        {error && <Alert variant="destructive" className="animate-card-reveal"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}

        <Button type="button" variant="outline" className="auth-google-button group h-12 w-full gap-3 rounded-xl bg-background/70" onClick={handleGoogleSignIn} disabled={busy}>
          {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
          <span>Continue with Google</span>
          {!googleLoading && <span className="ml-auto text-muted-foreground transition-transform group-hover:translate-x-0.5">→</span>}
        </Button>

        <div className="relative py-1"><div className="absolute inset-0 flex items-center"><Separator /></div><div className="relative flex justify-center text-[10px] font-semibold uppercase tracking-[0.18em]"><span className="bg-card px-3 text-muted-foreground">Or continue with email</span></div></div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="auth-input-wrap">
              <Mail className="auth-input-icon" />
              <Input id="email" type="email" placeholder="name@example.com" className="auth-input pl-10" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={busy} />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between"><Label htmlFor="password">Password</Label><Link to="/forgot-password" className="text-xs font-medium text-muted-foreground transition hover:text-primary">Forgot password?</Link></div>
            <div className="auth-input-wrap">
              <Lock className="auth-input-icon" />
              <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="Enter your password" className="auth-input pl-10 pr-11" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={busy} />
              <button type="button" onClick={() => setShowPassword((v) => !v)} className="auth-password-toggle focus-ring" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
            </div>
          </div>
          <Button type="submit" className="auth-submit-button h-12 w-full rounded-xl text-sm font-semibold shadow-lg shadow-primary/20" disabled={busy}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? 'Signing in…' : 'Sign in'}
            {!loading && <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-xs">↵</span>}
          </Button>
        </form>
      </div>
    </AuthExperience>
  );
}
