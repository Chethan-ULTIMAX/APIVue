import { Link, useLocation } from 'react-router-dom';
import {
  BarChart3,
  Brain,
  Compass,
  GitCompareArrows,
  LayoutDashboard,
  LogOut,
  Plug,
  Target,
  TrendingUp,
  Users,
  X,
  Radio,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  matchPrefix?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  { title: 'Overview', items: [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
    { icon: TrendingUp, label: 'Progress', href: '/dashboard/progress' },
  ] },
  { title: 'Analyze', items: [
    { icon: BarChart3, label: 'Analytics', href: '/dashboard/analytics' },
    { icon: GitCompareArrows, label: 'Compare', href: '/dashboard/compare' },
    { icon: Brain, label: 'AI Insights', href: '/dashboard/ai-insights' },
  ] },
  { title: 'Sources', items: [
    { icon: Users, label: 'Profiles', href: '/dashboard/profiles', matchPrefix: true },
    { icon: Compass, label: 'Explore', href: '/dashboard/explore' },
    { icon: Plug, label: 'Integrations', href: '/dashboard/integrations' },
  ] },
  { title: 'Personal', items: [
    { icon: Target, label: 'Goals', href: '/dashboard/goals' },
  ] },
];

function isItemActive(pathname: string, item: NavItem, allHrefs: string[]) {
  if (item.matchPrefix) {
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }
  if (pathname !== item.href) return false;
  return !allHrefs.some(
    (href) => href !== item.href && href.startsWith(`${item.href}/`) && pathname.startsWith(href),
  );
}

interface AppSidebarProps {
  onNavigate?: () => void;
  onClose?: () => void;
}

export function AppSidebar({ onNavigate, onClose }: AppSidebarProps = {}) {
  const location = useLocation();
  const { signOut, user } = useAuth();
  const allHrefs = NAV_SECTIONS.flatMap((section) => section.items.map((item) => item.href));
  const assetBase = import.meta.env.BASE_URL || '/';
  const logoSrc = `${assetBase.replace(/\/$/, '')}/favicon.ico`;

  return (
    <aside className="flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar/90 shadow-[8px_0_30px_-26px_hsl(var(--foreground)/.35)]">
      <div className="flex h-20 shrink-0 items-center justify-between border-b border-sidebar-border px-4">
        <Link to="/dashboard" className="group flex items-center gap-2.5" onClick={onNavigate}>
          <span className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <img src={logoSrc} alt="" className="relative z-10 h-6 w-6 object-contain brightness-0 invert" />
            <span className="absolute inset-0 bg-gradient-to-br from-white/25 to-transparent" />
          </span>
          <span className="bg-gradient-to-r from-foreground to-primary bg-clip-text text-xl font-black tracking-tight text-transparent">
            APIVue
          </span>
        </Link>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 lg:hidden" aria-label="Close navigation">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto p-3 scrollbar-thin">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="mb-5 last:mb-0">
            <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/55">
              {section.title}
            </p>
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isItemActive(location.pathname, item, allHrefs);
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={onNavigate}
                    className={cn(
                      'focus-ring group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200',
                      active
                        ? 'bg-primary/10 font-semibold text-primary shadow-sm before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-primary'
                        : 'text-muted-foreground hover:-translate-y-px hover:bg-accent/70 hover:text-foreground',
                    )}
                  >
                    <Icon className={cn('h-4 w-4 shrink-0 transition-transform group-hover:scale-105', active && 'text-primary')} />
                    <span className="truncate">{item.label}</span>
                    {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-sidebar-border p-3">
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-emerald-500/15 bg-emerald-500/[0.06] px-3 py-2.5">
          <Radio className="h-3.5 w-3.5 text-emerald-500" />
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Data engine</p>
            <p className="truncate text-[10px] text-muted-foreground">Ready for a sync</p>
          </div>
        </div>
        {user?.email && (
          <p className="mb-2 truncate rounded-lg bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground" title={user.email}>
            {user.email}
          </p>
        )}
        <button
          type="button"
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
