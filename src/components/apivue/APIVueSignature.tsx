/**
 * APIVue signature data-flow visual.
 *
 * Lightweight animated platform nodes feeding into a central APIVue
 * intelligence core. Uses only CSS transforms and opacity — no canvas,
 * no JS animation loop. Respects prefers-reduced-motion.
 */

import { getIntegration, integrations } from '@/lib/integrations/registry';

export function APIVueSignature({ activePlatforms }: { activePlatforms?: string[] }) {
  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const platformIds = activePlatforms?.length
    ? activePlatforms
    : integrations.map((i) => i.id);

  const nodes = platformIds.slice(0, 7);

  return (
    <div
      aria-hidden="true"
      className="relative flex h-32 items-center justify-center overflow-hidden rounded-2xl border border-border bg-card/40"
    >
      {/* Platform nodes on the left */}
      <div className="absolute left-4 flex flex-col gap-1.5 sm:left-6">
        {nodes.map((id, i) => {
          const integration = getIntegration(id);
          const Icon = integration.icon;
          return (
            <div
              key={id}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-background/80"
              style={{
                animation: reduced
                  ? undefined
                  : `apivue-node-pulse 2.5s ease-in-out ${i * 0.3}s infinite`,
              }}
            >
              <Icon
                className="h-3.5 w-3.5"
                style={{ color: integration.accent }}
              />
            </div>
          );
        })}
      </div>

      {/* Flow lines (CSS only) */}
      <div className="absolute left-12 top-1/2 h-px w-20 -translate-y-1/2 bg-gradient-to-r from-primary/40 to-primary/10 sm:left-16 sm:w-24" />

      {/* Central core */}
      <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-primary/30 bg-primary/10">
        <div
          className="absolute inset-0 rounded-2xl border-2 border-primary/20"
          style={{
            animation: reduced
              ? undefined
              : 'apivue-core-pulse 2s ease-in-out infinite',
          }}
        />
        <span className="text-xs font-black tracking-tight text-primary">
          APIVue
        </span>
      </div>

      {/* Output flow */}
      <div className="absolute right-12 top-1/2 h-px w-20 -translate-y-1/2 bg-gradient-to-l from-primary/40 to-primary/10 sm:right-16 sm:w-24" />

      {/* Output nodes */}
      <div className="absolute right-4 flex flex-col gap-1.5 sm:right-6">
        {['Normalized', 'Analytics', 'Insights'].map((label, i) => (
          <div
            key={label}
            className="flex h-7 items-center rounded-lg border border-border bg-background/80 px-2"
            style={{
              animation: reduced
                ? undefined
                : `apivue-node-pulse 2.5s ease-in-out ${0.5 + i * 0.3}s infinite`,
            }}
          >
            <span className="text-[9px] font-semibold text-muted-foreground">
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
