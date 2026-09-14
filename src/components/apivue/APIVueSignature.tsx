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
      className="relative flex min-h-40 items-center justify-center overflow-hidden rounded-2xl border border-primary/15 bg-card/55 px-20 shadow-inner shadow-primary/[0.03] sm:px-28"
    >
      <div className="pointer-events-none absolute inset-x-16 top-1/2 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      {/* Platform nodes on the left */}
      <div className="absolute left-4 flex flex-col gap-1.5 sm:left-6">
        {nodes.map((id, i) => {
          const integration = getIntegration(id);
          const Icon = integration.icon;
          return (
            <div
              key={id}
               className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background/80 shadow-sm"
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
      <div className="absolute left-12 top-1/2 h-px w-20 -translate-y-1/2 overflow-hidden bg-gradient-to-r from-primary/40 to-primary/10 sm:left-16 sm:w-24">
        {!reduced && <span className="apivue-flow-packet absolute left-0 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]" style={{ animation: 'apivue-flow 2.4s linear infinite' }} />}
      </div>

      {/* Central core */}
      <div className="apivue-core relative z-10 flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-primary/30 bg-primary/10 shadow-xl shadow-primary/10" style={{ animation: reduced ? undefined : 'apivue-glow 3s ease-in-out infinite' }}>
        <div
          className="absolute inset-0 rounded-2xl border-2 border-primary/20"
          style={{
            animation: reduced
              ? undefined
              : 'apivue-core-pulse 2s ease-in-out infinite',
          }}
        />
        <span className="text-center text-[10px] font-black uppercase tracking-[0.16em] text-primary">
          APIVue
          <span className="mt-1 block font-mono text-[8px] font-medium tracking-normal text-primary/60">core</span>
        </span>
      </div>

      {/* Output flow */}
      <div className="absolute right-12 top-1/2 h-px w-20 -translate-y-1/2 overflow-hidden bg-gradient-to-l from-primary/40 to-primary/10 sm:right-16 sm:w-24">
        {!reduced && <span className="apivue-flow-packet absolute right-0 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]" style={{ animation: 'apivue-flow 2.4s linear 1.2s infinite reverse' }} />}
      </div>

      {/* Output nodes */}
      <div className="absolute right-4 flex flex-col gap-1.5 sm:right-6">
        {['Normalized', 'Analytics', 'Insights'].map((label, i) => (
          <div
            key={label}
               className="flex h-8 items-center rounded-lg border border-border bg-background/80 px-2.5 shadow-sm"
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
