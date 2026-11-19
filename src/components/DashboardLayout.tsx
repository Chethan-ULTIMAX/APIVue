import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight, Command, Menu, Search, Sparkles } from 'lucide-react';

import { AppSidebar } from '@/components/AppSidebar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/* The palette (and cmdk behind it) is only fetched the first time someone
   actually opens it, so it never taxes the initial dashboard payload. */
const CommandPalette = lazy(() =>
  import('@/components/CommandPalette').then((module) => ({ default: module.CommandPalette })),
);

const pageNames: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/requests': 'Requests',
  '/dashboard/profiles': 'Profiles',
  '/dashboard/progress': 'Progress',
  '/dashboard/explore': 'Explore',
  '/dashboard/compare': 'Compare',
  '/dashboard/analytics': 'Analytics',
  '/dashboard/integrations': 'Integrations',
  '/dashboard/ai-insights': 'AI Insights',
  '/dashboard/goals': 'Goals',
  '/dashboard/settings': 'Settings',
};

export function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  /* Cmd/Ctrl+K opens a real command palette (search + actions), not a text
     input with a hidden Enter handler. Escape and the overlay both close it. */
  const [paletteOpen, setPaletteOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => setPaletteOpen(false), [location.pathname]);

  const currentPage = useMemo(() => {
    if (pageNames[location.pathname]) return pageNames[location.pathname];
    if (location.pathname.startsWith('/dashboard/profile/')) return 'Profile';
    return 'APIVue';
  }, [location.pathname]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
      if (event.key === 'Escape') setPaletteOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="flex min-h-screen w-full bg-background">
      <div className="hidden lg:flex">
        <AppSidebar />
      </div>

      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 left-0 z-50 lg:hidden">
            <AppSidebar
              onNavigate={() => setMobileOpen(false)}
              onClose={() => setMobileOpen(false)}
            />
          </div>
        </>
      )}

      {paletteOpen ? (
        <Suspense fallback={null}>
          <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
        </Suspense>
      ) : null}

      <div className="flex min-h-screen min-w-0 flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-border/70 bg-background/80 px-3 backdrop-blur-xl sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="h-4 w-4" aria-hidden="true" />
            </Button>
            <div className="hidden items-center gap-1.5 text-sm sm:flex">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">APIVue</span>
              <ChevronRight className="h-3 w-3 text-muted-foreground/40" aria-hidden="true" />
              <span className="font-medium text-foreground">{currentPage}</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-2 rounded-lg px-2.5 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setPaletteOpen(true)}
              aria-label="Search dashboard pages and actions"
              aria-expanded={paletteOpen}
              aria-haspopup="dialog"
              title="Search pages and actions (Ctrl/Cmd + K)"
            >
              <Search className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden md:inline">Search</span>
              <kbd className="hidden rounded border border-border/80 bg-muted/50 px-1.5 py-0.5 font-mono text-[9px] md:inline-flex"><Command className="mr-0.5 h-2.5 w-2.5" />K</kbd>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="hidden h-8 gap-1.5 rounded-lg text-xs sm:flex"
              onClick={() => navigate('/dashboard/ai-insights')}
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              AI Insights
            </Button>
            <ThemeToggle />
          </div>
        </header>

        <main className={cn('min-w-0 flex-1 overflow-auto scrollbar-thin')}>
          {/* Announce the page change for screen readers; the visual
              transition alone carries no text. */}
          <span key={`live-${location.pathname}`} role="status" aria-live="polite" className="sr-only">
            {currentPage} page
          </span>
          {/*
            Keying on pathname replays the entrance animation on every route
            change. This is the cheapest correct approach: no AnimatePresence,
            no extra dependency, and the tree genuinely is a different page.
          */}
          <div key={location.pathname} className="route-enter h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
