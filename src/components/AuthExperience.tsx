import { useRef, type MouseEvent, type ReactNode } from 'react';
import { Check, Moon, Sparkles, Sun } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTheme } from '@/lib/theme-context';
import './auth-experience.css';

export type AuthMode = 'signin' | 'signup';

interface AuthExperienceProps {
  mode: AuthMode;
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}

function AuthVisual({ mode }: { mode: AuthMode }) {
  const visualRef = useRef<HTMLDivElement>(null);

  const handleMove = (event: MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    visualRef.current?.style.setProperty('--auth-mx', `${x * 10}px`);
    visualRef.current?.style.setProperty('--auth-my', `${y * 8}px`);
  };

  const handleLeave = () => {
    visualRef.current?.style.setProperty('--auth-mx', '0px');
    visualRef.current?.style.setProperty('--auth-my', '0px');
  };

  return (
    <div ref={visualRef} onMouseMove={handleMove} onMouseLeave={handleLeave} className={`auth-visual auth-visual-${mode} group relative min-h-[430px] overflow-hidden rounded-[28px] border p-7 sm:p-9 lg:min-h-[calc(100vh-48px)] lg:p-10`}>
      <div className="auth-visual-grid" />
      <div className="auth-orb auth-orb-one" />
      <div className="auth-orb auth-orb-two" />

      <div className="relative z-10 flex h-full min-h-[390px] flex-col justify-between lg:min-h-[calc(100vh-128px)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-semibold backdrop-blur-xl">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30"><Sparkles className="h-3.5 w-3.5" /></span>
            APIVue intelligence
          </div>
          <span className="font-mono-id text-[10px] uppercase tracking-[0.22em] text-white/45">{mode === 'signin' ? 'return / connect' : 'new / identity'}</span>
        </div>

        <div className="relative mx-auto w-full max-w-[650px] flex-1 py-8 lg:py-12">
          <div className="auth-visual-scene absolute inset-0">
            <div className="auth-ring auth-ring-one" />
            <div className="auth-ring auth-ring-two" />
            <div className="auth-ring auth-ring-three" />
            <svg className="auth-network" viewBox="0 0 700 500" fill="none" aria-hidden="true">
              <defs>
                <linearGradient id="authLine" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="currentColor" stopOpacity="0" />
                  <stop offset="0.45" stopColor="currentColor" stopOpacity="0.6" />
                  <stop offset="1" stopColor="currentColor" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M72 115C170 85 198 185 300 150S472 70 624 132" stroke="url(#authLine)" strokeWidth="1.4" />
              <path d="M38 350C155 280 208 394 315 332S492 244 662 336" stroke="url(#authLine)" strokeWidth="1.4" />
              <path d="M180 48C205 180 370 204 438 92S545 72 592 238" stroke="url(#authLine)" strokeWidth="1.2" />
              <path d="M104 226C220 250 286 212 354 254S512 430 618 398" stroke="url(#authLine)" strokeWidth="1.2" />
              <circle cx="72" cy="115" r="4" fill="currentColor" className="auth-node" />
              <circle cx="198" cy="185" r="3" fill="currentColor" className="auth-node auth-node-delay-1" />
              <circle cx="300" cy="150" r="5" fill="currentColor" className="auth-node auth-node-delay-2" />
              <circle cx="472" cy="70" r="3" fill="currentColor" className="auth-node auth-node-delay-3" />
              <circle cx="624" cy="132" r="4" fill="currentColor" className="auth-node auth-node-delay-1" />
              <circle cx="315" cy="332" r="4" fill="currentColor" className="auth-node auth-node-delay-2" />
              <circle cx="492" cy="244" r="3" fill="currentColor" className="auth-node auth-node-delay-3" />
            </svg>

            <div className="auth-core-card" aria-hidden="true">
              <div className="auth-core-glow" />
              <div className="auth-core-surface relative rounded-2xl border border-white/10 bg-[#0c0e15]/90 p-4 shadow-2xl shadow-black/30 backdrop-blur-xl">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/40">Developer graph</div>
                    <div className="mt-1 text-sm font-semibold text-white">Everything in one view</div>
                  </div>
                  <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.8)]" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {['GitHub', 'Code', 'Security'].map((label) => (
                    <div key={label} className="rounded-xl border border-white/10 bg-white/[0.035] px-2 py-3">
                      <div className="mb-2 h-1.5 w-1/2 rounded-full bg-primary/60" />
                      <div className="text-[9px] font-medium text-white/55">{label}</div>
                      <div className="mt-2 flex gap-1"><span className="h-1.5 flex-1 rounded-full bg-primary/35" /><span className="h-1.5 w-1/4 rounded-full bg-cyan-400/35" /></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-xl">
          <div className="mb-4 flex items-center gap-2 text-xs font-semibold text-primary"><span className="h-px w-8 bg-primary/60" />{mode === 'signin' ? 'Pick up where you left off' : 'Build your developer identity'}</div>
          <h2 className="max-w-lg text-3xl font-semibold tracking-tight text-white sm:text-4xl">Connect the work you do. <span className="text-white/45">See the story it creates.</span></h2>
          <p className="mt-4 max-w-xl text-sm leading-6 text-white/55">APIVue brings your developer tools into one calm, interactive space so your progress feels visible instead of scattered.</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {['Progress', 'Profiles', 'Goals', 'Insights'].map((item) => (
              <span key={item} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-[11px] font-medium text-white/65 backdrop-blur"><Check className="h-3 w-3 text-primary" />{item}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AuthExperience({ mode, title, description, children, footer }: AuthExperienceProps) {
  const { theme, toggleTheme } = useTheme();
  const logoSrc = `${import.meta.env.BASE_URL}favicon.ico`;

  return (
    <main className={`auth-page auth-page-${mode} min-h-screen overflow-hidden bg-background text-foreground`}>
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,hsl(var(--primary)/.08),transparent_34rem)]" />
      <div className="relative mx-auto grid min-h-screen max-w-[1540px] gap-0 p-3 sm:p-5 lg:grid-cols-2 lg:gap-5 lg:p-6">
        <section className={`auth-form-column auth-form-${mode} flex min-h-[720px] flex-col justify-between rounded-[28px] border border-border/70 bg-card/85 p-5 shadow-2xl shadow-black/5 backdrop-blur-xl sm:p-8 lg:min-h-[calc(100vh-48px)] lg:p-10`}>
          <header className="flex items-center justify-between">
            <Link to="/" className="group inline-flex items-center gap-2.5 rounded-full px-1 py-1.5 focus-ring" aria-label="APIVue home">
              <span className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-background shadow-sm transition-transform duration-300 group-hover:rotate-3 group-hover:scale-105"><img src={logoSrc} alt="APIVue" className="h-6 w-6 object-contain" /></span>
              <span className="text-sm font-bold tracking-tight">APIVue</span>
            </Link>
            <button type="button" onClick={toggleTheme} className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/80 text-muted-foreground transition hover:-translate-y-0.5 hover:text-foreground" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>{theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button>
          </header>

          <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center py-10">
            <div className="mb-8">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/[0.06] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-primary"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />{mode === 'signin' ? 'Welcome back' : 'Start your workspace'}</div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
              <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
            </div>
            {children}
          </div>

          <div className="pt-4 text-center text-sm text-muted-foreground">{footer}</div>
        </section>

        <section className="auth-visual-column hidden lg:block"><AuthVisual mode={mode} /></section>
      </div>
    </main>
  );
}
