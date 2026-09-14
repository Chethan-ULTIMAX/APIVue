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
  if (item.matchPrefix) return pathname === item.href || pathname.startsWith(`${item.href}/`);
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
    <aside className="flex h-full w-[248px] flex-col border-r border-sidebar-border bg-sidebar/95">
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-sidebar-border px-3">
        <Link to="/dashboard" className="group flex items-center gap-2.5 rounded-lg px-1.5 py-1" onClick={onNavigate}>
          <span className="relative flex h-7 w-7 items-center justify-center overflow-hidden rounded-lg bg-primary text-primary-foreground shadow-sm shadow-primary/20 transition-transform duration-200 group-hover:scale-105">
            <img src={logoSrc} alt="" className="relative z-10 h-5 w-5 object-contain brightness-0 invert" />
            <span className="absolute inset-0 bg-gradient-to-br from-white/25 to-transparent" />
          </span>
          <span className="text-[15px] font-semibold tracking-[-0.02em] text-foreground">APIVue</span>
        </Link>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-lg lg:hidden" aria-label="Close navigation">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 py-4 scrollbar-thin">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="mb-5 last:mb-0">
            <p className="px-2.5 pb-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/50">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isItemActive(location.pathname, item, allHrefs);
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={onNavigate}
                    className={cn(
                      'focus-ring group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-[background-color,color,transform] duration-150',
                      active
                        ? 'bg-accent font-medium text-foreground shadow-[inset_0_0_0_1px_hsl(var(--border)/.45)]'
                        : 'text-muted-foreground hover:bg-accent/65 hover:text-foreground',
                    )}
                  >
                    <Icon className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-colors', active && 'text-primary')} />
                    <span className="truncate">{item.label}</span>
                    {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-sidebar-border p-2.5">
        <div className="mb-2 flex items-center gap-2 rounded-lg border border-emerald-500/15 bg-emerald-500/[0.045] px-2.5 py-2">
          <Radio className="h-3.5 w-3.5 text-emerald-500" />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Data engine</p>
            <p className="truncate text-[10px] text-muted-foreground">Ready for a sync</p>
          </div>
        </div>
        {user?.email && (
          <p className="mb-1 truncate rounded-lg px-2.5 py-2 text-[11px] text-muted-foreground" title={user.email}>
            {user.email}
          </p>
        )}
        <button
          type="button"
          onClick={signOut}
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
