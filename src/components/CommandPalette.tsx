import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Brain,
  Compass,
  GitCompareArrows,
  LayoutDashboard,
  LogOut,
  Moon,
  Plug,
  Send,
  Settings,
  Sun,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';

/**
 * Single source of truth for "where can I go from here".
 * Keys are real routes registered in App.tsx — nothing here navigates
 * anywhere that would 404.
 */
const DESTINATIONS = [
  { path: '/dashboard/requests', label: 'Requests', hint: 'API workspace', icon: Send, group: 'Workspace' },
  { path: '/dashboard', label: 'Dashboard', hint: 'Overview', icon: LayoutDashboard, group: 'Overview' },
  { path: '/dashboard/progress', label: 'Progress', hint: 'Trends over time', icon: TrendingUp, group: 'Overview' },
  { path: '/dashboard/analytics', label: 'Analytics', hint: 'Cross-source metrics', icon: BarChart3, group: 'Analyze' },
  { path: '/dashboard/compare', label: 'Compare', hint: 'Side-by-side profiles', icon: GitCompareArrows, group: 'Analyze' },
  { path: '/dashboard/ai-insights', label: 'AI Insights', hint: 'Derived observations', icon: Brain, group: 'Analyze' },
  { path: '/dashboard/profiles', label: 'Profiles', hint: 'Tracked sources', icon: Users, group: 'Sources' },
  { path: '/dashboard/explore', label: 'Explore', hint: 'Public data', icon: Compass, group: 'Sources' },
  { path: '/dashboard/integrations', label: 'Integrations', hint: 'Connect platforms', icon: Plug, group: 'Sources' },
  { path: '/dashboard/goals', label: 'Goals', hint: 'Targets you set', icon: Target, group: 'Personal' },
  { path: '/dashboard/settings', label: 'Settings', hint: 'Account and appearance', icon: Settings, group: 'Personal' },
] as const;

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { signOut } = useAuth();

  /* Group order follows the sidebar so muscle memory carries over. */
  const groups = useMemo(() => {
    const map = new Map<string, typeof DESTINATIONS[number][]>();
    for (const item of DESTINATIONS) {
      const list = map.get(item.group) ?? [];
      list.push(item);
      map.set(item.group, list);
    }
    return [...map.entries()];
  }, []);

  const go = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search pages and actions…" aria-label="Command palette search" />
      <CommandList>
        <CommandEmpty>No matching page or action.</CommandEmpty>
        {groups.map(([group, items]) => (
          <CommandGroup key={group} heading={group}>
            {items.map((item) => (
              <CommandItem
                key={item.path}
                value={`${item.label} ${item.group} ${item.hint}`}
                onSelect={() => go(item.path)}
                className="group gap-2.5 rounded-md"
              >
                <item.icon
                  className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-data-[selected=true]:text-primary"
                  aria-hidden="true"
                />
                <span className="font-medium">{item.label}</span>
                <span className="ml-auto text-[11px] text-muted-foreground" aria-hidden="true">
                  {item.hint}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}

        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem
            value={`appearance theme ${theme === 'dark' ? 'light' : 'dark'} mode switch`}
            onSelect={() => {
              toggleTheme();
              onOpenChange(false);
            }}
            className="gap-2.5 rounded-md"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            ) : (
              <Moon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            )}
            <span className="font-medium">
              Switch to {theme === 'dark' ? 'light' : 'dark'} mode
            </span>
          </CommandItem>
          <CommandItem
            value="sign out log out end session"
            onSelect={() => {
              onOpenChange(false);
              void signOut();
            }}
            className="gap-2.5 rounded-md group"
          >
            <LogOut className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="font-medium">Sign out</span>
            <CommandShortcut aria-hidden="true">Ends this session</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
