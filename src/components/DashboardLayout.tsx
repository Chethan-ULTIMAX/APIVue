import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight, Command, Menu, Search, Sparkles } from 'lucide-react';

import { AppSidebar } from '@/components/AppSidebar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const pageNames: Record<string, string> = {
  '/dashboard': 'Dashboard',
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
  const [searchOpen, setSearchOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const currentPage = useMemo(() => {
    if (pageNames[location.pathname]) return pageNames[location.pathname];
    if (location.pathname.startsWith('/dashboard/profile/')) return 'Profile';
    return 'APIVue';
  }, [location.pathname]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === 'Escape') setSearchOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleSearch = (value: string) => {
    const q = value.trim().toLowerCase();
    if (!q) return;
    const match = Object.entries(pageNames).find(([path, name]) =>
      path !== '/dashboard' && name.toLowerCase().includes(q),
    );
    if (match) {
      navigate(match[0]);
      setSearchOpen(false);
    } else if ('dashboard'.includes(q)) {
      navigate('/dashboard');
      setSearchOpen(false);
    }
  };

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

      <div className="flex min-h-screen min-w-0 flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-border/70 bg-background/85 px-3 backdrop-blur-xl sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="h-4 w-4" />
            </Button>
            <div className="hidden items-center gap-1.5 text-sm sm:flex">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">APIVue</span>
              <ChevronRight className="h-3 w-3 text-muted-foreground/40" />
              <span className="font-medium text-foreground">{currentPage}</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {searchOpen && (
              <div className="relative hidden sm:block animate-card-reveal">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  autoFocus
                  className="h-8 w-64 rounded-lg border-border/70 bg-muted/30 pl-8 pr-10 text-xs shadow-none focus-visible:ring-1"
                  placeholder="Jump to a page…"
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') handleSearch(event.currentTarget.value);
                    if (event.key === 'Escape') setSearchOpen(false);
                  }}
                  onBlur={() => setSearchOpen(false)}
                />
                <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">Esc</kbd>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-2 rounded-lg px-2.5 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setSearchOpen((open) => !open)}
              aria-label="Search dashboard"
              title="Jump to a page (Ctrl/Cmd+K)"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Search</span>
              <kbd className="hidden rounded border border-border/80 bg-muted/50 px-1.5 py-0.5 font-mono text-[9px] md:inline-flex"><Command className="mr-0.5 h-2.5 w-2.5" />K</kbd>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="hidden h-8 gap-1.5 rounded-lg text-xs sm:flex"
              onClick={() => navigate('/dashboard/ai-insights')}
            >
              <Sparkles className="h-3.5 w-3.5" />
              AI Insights
            </Button>
            <ThemeToggle />
          </div>
        </header>

        <main className={cn('min-w-0 flex-1 overflow-auto scrollbar-thin')}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
