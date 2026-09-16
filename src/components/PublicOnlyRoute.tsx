import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import { useAuth } from '@/lib/auth-context';

/** Keeps authenticated users out of the sign-in/sign-up screens. */
export function PublicOnlyRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (user) {
    const next = new URLSearchParams(location.search).get('next');
    const safeNext = next && /^\/(?!\/)/.test(next) ? next : '/dashboard';
    return <Navigate to={safeNext} replace />;
  }

  return <Outlet />;
}
