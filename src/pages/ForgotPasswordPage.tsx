import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Loader2, Mail } from 'lucide-react';

import { useAuth } from '@/lib/auth-context';
import { friendlyAuthError } from '@/lib/auth-errors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<ReturnType<typeof friendlyAuthError> | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { resetPassword } = useAuth();
  const logoSrc = `${import.meta.env.BASE_URL}favicon.ico`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await resetPassword(email.trim());
      setSuccess(true);
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background p-4">
      {/* Same ambient wash as the sign-in/sign-up panels, so recovery does not
          feel like a different product. */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsl(var(--primary)/.07),transparent_32rem)]"
        aria-hidden="true"
      />
      <Card className="animate-enter-up relative w-full max-w-md border-border/80 shadow-elev-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="mb-2 flex justify-center"><div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface-1"><img src={logoSrc} alt="" className="h-8 w-8 object-contain" /></div></div>
          <CardTitle className="text-2xl font-semibold tracking-tight">Reset your password</CardTitle>
          <CardDescription>
            Enter the email you signed up with and we&apos;ll send a reset link.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <span className="font-medium">{error.message}</span>
                  {error.hint ? <span className="mt-1 block text-xs opacity-90">{error.hint}</span> : null}
                </AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert className="animate-enter-sm border-success/25 bg-success/5">
                <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
                <AlertDescription id="reset-sent-notice">
                  Check your inbox for the reset link.
                </AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="email"
                  type="email"
                  inputMode="email"
                  placeholder="name@example.com"
                  className="h-11 pl-9"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading || success}
                  aria-describedby={success ? 'reset-sent-notice' : undefined}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4"><Button type="submit" className="h-11 w-full font-semibold" disabled={loading || success} aria-busy={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}{loading ? 'Sending…' : success ? 'Email sent' : 'Send reset link'}</Button><p className="text-center text-sm text-muted-foreground">Remember your password? <Link to="/login" className="text-primary hover:underline">Sign in</Link></p></CardFooter>
        </form>
      </Card>
    </div>
  );
}