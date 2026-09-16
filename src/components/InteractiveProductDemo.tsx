import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  Check,
  Code2,
  GitBranch,
  Github,
  Goal,
  Layers3,
  Lock,
  Network,
  Radar,
  Search,
  Shield,
  Sparkles,
  Target,
  Trophy,
  Users,
  X,
  Zap,
} from 'lucide-react';

const screens = [
  { label: 'Connect', eyebrow: '01', title: 'Everything starts here.' },
  { label: 'Progress', eyebrow: '02', title: 'See the whole trajectory.' },
  { label: 'Explore', eyebrow: '03', title: 'Find what matters next.' },
  { label: 'Compare', eyebrow: '04', title: 'Put your growth in context.' },
  { label: 'Integrations', eyebrow: '05', title: 'One layer across your tools.' },
  { label: 'Goals', eyebrow: '06', title: 'Turn intent into momentum.' },
  { label: 'Your APIVue', eyebrow: '07', title: 'Make the data yours.' },
];

const platforms = [
  { name: 'GitHub', color: 'violet', icon: Github, x: '8%', y: '12%' },
  { name: 'LeetCode', color: 'orange', icon: Code2, x: '92%', y: '12%' },
  { name: 'Codeforces', color: 'pink', icon: Trophy, x: '4%', y: '50%' },
  { name: 'Codewars', color: 'red', icon: Zap, x: '96%', y: '50%' },
  { name: 'Stack Overflow', color: 'blue', icon: BookOpen, x: '14%', y: '86%' },
  { name: 'TryHackMe', color: 'rose', icon: Shield, x: '86%', y: '86%' },
  { name: 'Hack The Box', color: 'green', icon: Target, x: '50%', y: '94%' },
];

function colorClasses(color: string) {
  const map: Record<string, string> = {
    violet: 'border-violet-400/30 bg-violet-500/10 text-violet-300',
    orange: 'border-orange-400/30 bg-orange-500/10 text-orange-300',
    pink: 'border-pink-400/30 bg-pink-500/10 text-pink-300',
    red: 'border-red-400/30 bg-red-500/10 text-red-300',
    blue: 'border-blue-400/30 bg-blue-500/10 text-blue-300',
    rose: 'border-rose-400/30 bg-rose-500/10 text-rose-300',
    green: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300',
  };
  return map[color] ?? map.violet;
}

function WindowChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative h-full overflow-hidden rounded-[22px] border border-white/10 bg-[#0a0d13] shadow-2xl shadow-black/40">
      <div className="flex h-10 items-center gap-1.5 border-b border-white/[0.07] bg-white/[0.02] px-4">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-300/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
        <div className="mx-auto rounded-md border border-white/[0.06] bg-white/[0.025] px-16 py-1 text-[8px] text-zinc-600">
          app.apivue.dev
        </div>
        <div className="h-4 w-12" />
      </div>
      <div className="h-[calc(100%-40px)]">{children}</div>
    </div>
  );
}

function NetworkScreen() {
  return (
    <WindowChrome>
      <div className="relative h-full overflow-hidden bg-[radial-gradient(circle_at_50%_48%,rgba(124,58,237,.16),transparent_30%),#080a0f]">
        <div className="absolute inset-0 opacity-[0.045] [background-image:linear-gradient(rgba(255,255,255,.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.8)_1px,transparent_1px)] [background-size:32px_32px]" />
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 800 520" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <filter id="demoGlow"><feGaussianBlur stdDeviation="3" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          </defs>
          {platforms.map((p, i) => {
            const colors = ['#a78bfa', '#fb923c', '#f472b6', '#f87171', '#60a5fa', '#fb7185', '#34d399'];
            const points = [[85,65],[715,65],[60,260],[740,260],[110,445],[690,445],[400,490]][i];
            return <line key={p.name} x1={points[0]} y1={points[1]} x2="400" y2="260" stroke={colors[i]} strokeOpacity=".32" strokeWidth="1.4" strokeDasharray="4 9" />;
          })}
          <circle cx="400" cy="260" r="92" fill="none" stroke="#8b5cf6" strokeOpacity=".12" />
          <circle cx="400" cy="260" r="68" fill="#0d1117" stroke="#8b5cf6" strokeOpacity=".55" />
          <circle cx="400" cy="260" r="53" fill="none" stroke="#38bdf8" strokeOpacity=".22" />
          {!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches && <circle cx="400" cy="260" r="4" fill="#c4b5fd" filter="url(#demoGlow)"><animateMotion dur="3.4s" repeatCount="indefinite" path="M 85,65 Q 250,150 400,260" /></circle>}
        </svg>
        {platforms.map(({ name, icon: Icon, color, x, y }) => (
          <div key={name} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: x, top: y }}>
            <div className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 backdrop-blur-md ${colorClasses(color)}`}>
              <Icon className="h-3.5 w-3.5" />
              <span className="whitespace-nowrap text-[9px] font-medium text-zinc-200">{name}</span>
            </div>
          </div>
        ))}
        <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-400/40 bg-[#0d1117] shadow-[0_0_42px_rgba(139,92,246,.28)]">
            <Sparkles className="h-6 w-6 text-violet-300" />
          </div>
          <span className="mt-2 text-[10px] font-semibold text-white">APIVue Core</span>
        </div>
      </div>
    </WindowChrome>
  );
}

function ProgressScreen() {
  const bars = [42, 64, 51, 78, 68, 86, 73, 92, 80, 96];
  const heat = useMemo(() => Array.from({ length: 84 }, (_, i) => (i * 7 + 3) % 5), []);
  return (
    <WindowChrome>
      <div className="h-full overflow-hidden p-4 sm:p-5">
        <div className="flex items-start justify-between">
          <div><div className="text-[9px] uppercase tracking-[.18em] text-violet-400">Progress</div><div className="mt-1 text-lg font-semibold text-white">Your trajectory</div></div>
          <div className="rounded-lg border border-white/[.07] bg-white/[.025] px-3 py-2 text-[9px] text-zinc-500">Last 90 days</div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {['Development','DSA / CP','Security'].map((x, i) => <div key={x} className="rounded-xl border border-white/[.07] bg-white/[.025] p-3"><div className="text-[8px] text-zinc-500">{x}</div><div className="mt-1 text-base font-bold text-white">{[82,67,54][i]}%</div><div className="mt-1 text-[7px] text-emerald-400">moving this week</div></div>)}
        </div>
        <div className="mt-3 rounded-xl border border-white/[.07] bg-white/[.02] p-3">
          <div className="flex items-center justify-between text-[8px] text-zinc-500"><span>Activity momentum</span><span>Mon → Sun</span></div>
          <div className="mt-4 flex h-24 items-end gap-1.5">{bars.map((h, i) => <div key={i} className="flex-1 rounded-t bg-violet-400/55 transition-transform duration-300 hover:-translate-y-1" style={{ height: `${h}%` }} />)}</div>
        </div>
        <div className="mt-3 rounded-xl border border-white/[.07] bg-white/[.02] p-3">
          <div className="flex items-center justify-between"><span className="text-[8px] text-zinc-500">Consistency</span><span className="text-[8px] text-emerald-400">12 day streak</span></div>
          <div className="mt-3 grid grid-cols-12 gap-1">{heat.map((v, i) => <div key={i} className={`aspect-square rounded-[3px] ${v === 0 ? 'bg-white/[.035]' : v === 1 ? 'bg-violet-500/15' : v === 2 ? 'bg-violet-500/30' : v === 3 ? 'bg-violet-400/55' : 'bg-violet-300/80'}`} />)}</div>
        </div>
      </div>
    </WindowChrome>
  );
}

function ExploreScreen() {
  return (
    <WindowChrome>
      <div className="h-full overflow-hidden p-4 sm:p-5">
        <div className="flex items-center justify-between"><div><div className="text-[9px] uppercase tracking-[.18em] text-violet-400">Explore</div><div className="mt-1 text-lg font-semibold text-white">Discover your next move</div></div><Search className="h-4 w-4 text-zinc-500" /></div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {[['Consistency gaps', '3 areas worth revisiting', Radar], ['Rising skills', 'Web security · APIs', Zap], ['Suggested practice', 'Keep your current streak', Trophy], ['Recent activity', 'See what changed', ActivityIcon]].map(([title, sub, Icon]) => <div key={title as string} className="group rounded-xl border border-white/[.07] bg-white/[.025] p-3 transition duration-300 hover:-translate-y-1 hover:border-violet-400/30 hover:bg-violet-500/[.06]"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-300"><Icon className="h-4 w-4" /></div><div className="mt-3 text-[10px] font-semibold text-white">{title as string}</div><div className="mt-1 text-[8px] leading-4 text-zinc-500">{sub as string}</div><ArrowRight className="mt-3 h-3 w-3 text-zinc-600 transition group-hover:translate-x-1 group-hover:text-violet-300" /></div>)}
        </div>
        <div className="mt-3 rounded-xl border border-violet-400/15 bg-gradient-to-br from-violet-500/[.08] to-blue-500/[.03] p-4"><div className="flex items-center gap-2 text-[9px] font-semibold text-violet-200"><Sparkles className="h-3.5 w-3.5" /> APIVue signal</div><p className="mt-2 text-[9px] leading-5 text-zinc-400">Your activity is strongest when development and security practice happen in the same week.</p></div>
      </div>
    </WindowChrome>
  );
}

function ActivityIcon({ className }: { className?: string }) { return <BarChart3 className={className} />; }

function CompareScreen() {
  const rows = [['Activity', 'High', 'Medium'], ['Consistency', '92%', '71%'], ['Projects', '12', '8'], ['Problem solving', 'Advanced', 'Intermediate']];
  return (
    <WindowChrome>
      <div className="h-full overflow-hidden p-4 sm:p-5">
        <div className="flex items-start justify-between"><div><div className="text-[9px] uppercase tracking-[.18em] text-violet-400">Compare</div><div className="mt-1 text-lg font-semibold text-white">See the difference</div></div><Users className="h-4 w-4 text-zinc-500" /></div>
        <div className="mt-4 rounded-xl border border-white/[.07] overflow-hidden">
          <div className="grid grid-cols-3 border-b border-white/[.07] bg-white/[.025] p-3 text-[8px] text-zinc-500"><span>Metric</span><span className="text-center text-violet-300">You</span><span className="text-center">Profile B</span></div>
          {rows.map(([name, a, b]) => <div key={name} className="grid grid-cols-3 border-b border-white/[.05] p-3 text-[9px] last:border-0"><span className="text-zinc-400">{name}</span><span className="text-center font-semibold text-white">{a}</span><span className="text-center text-zinc-500">{b}</span></div>)}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2"><div className="rounded-xl border border-violet-400/15 bg-violet-500/[.06] p-3"><GitBranch className="h-4 w-4 text-violet-300" /><div className="mt-2 text-[9px] font-semibold text-white">Strengths</div><div className="mt-1 text-[8px] text-zinc-500">Consistency · projects</div></div><div className="rounded-xl border border-white/[.07] bg-white/[.025] p-3"><Layers3 className="h-4 w-4 text-zinc-400" /><div className="mt-2 text-[9px] font-semibold text-white">Context</div><div className="mt-1 text-[8px] text-zinc-500">Compare without losing detail</div></div></div>
      </div>
    </WindowChrome>
  );
}

function IntegrationsScreen() {
  const items = ['GitHub', 'LeetCode', 'Codeforces', 'Codewars', 'Stack Overflow', 'TryHackMe', 'Hack The Box', 'AtCoder'];
  return (
    <WindowChrome>
      <div className="h-full overflow-hidden p-4 sm:p-5">
        <div className="text-[9px] uppercase tracking-[.18em] text-violet-400">Integrations</div><div className="mt-1 text-lg font-semibold text-white">Your ecosystem, connected.</div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">{items.map((name, i) => <div key={name} className="group rounded-xl border border-white/[.07] bg-white/[.025] p-3 transition duration-300 hover:-translate-y-1 hover:border-violet-400/25"><div className="flex items-center justify-between"><div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[.04] text-zinc-400">{i === 0 ? <Github className="h-4 w-4" /> : i === 2 ? <Trophy className="h-4 w-4" /> : i === 6 ? <Shield className="h-4 w-4" /> : <Code2 className="h-4 w-4" />}</div><Check className="h-3 w-3 text-emerald-400" /></div><div className="mt-2 text-[9px] font-medium text-zinc-300">{name}</div><div className="mt-1 text-[7px] text-zinc-600">Connected</div></div>)}</div>
        <div className="mt-3 flex items-center gap-3 rounded-xl border border-emerald-400/15 bg-emerald-400/[.04] p-3"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-400/10"><Network className="h-4 w-4 text-emerald-300" /></div><div><div className="text-[9px] font-semibold text-white">One normalized activity layer</div><div className="mt-1 text-[8px] text-zinc-500">Different tools. One consistent model.</div></div></div>
      </div>
    </WindowChrome>
  );
}

function GoalsScreen() {
  const goals = [['Build consistently', 74, 'Development'], ['Strengthen DSA', 58, 'Problem solving'], ['Security practice', 42, 'Cybersecurity']];
  return (
    <WindowChrome>
      <div className="h-full overflow-hidden p-4 sm:p-5"><div className="flex items-start justify-between"><div><div className="text-[9px] uppercase tracking-[.18em] text-violet-400">Goals</div><div className="mt-1 text-lg font-semibold text-white">Small actions. Visible progress.</div></div><Goal className="h-4 w-4 text-zinc-500" /></div>
        <div className="mt-4 space-y-2">{goals.map(([title, progress, sub]) => <div key={title} className="rounded-xl border border-white/[.07] bg-white/[.025] p-3"><div className="flex items-center justify-between"><div><div className="text-[9px] font-semibold text-white">{title}</div><div className="mt-1 text-[7px] text-zinc-600">{sub}</div></div><span className="text-[9px] font-bold text-violet-300">{progress}%</span></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[.06]"><div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-400" style={{ width: `${progress}%` }} /></div></div>)}</div>
        <div className="mt-3 rounded-xl border border-violet-400/15 bg-violet-500/[.06] p-4"><div className="flex items-center gap-2 text-[9px] font-semibold text-violet-200"><Target className="h-3.5 w-3.5" /> Next recommended action</div><div className="mt-2 text-[11px] font-semibold text-white">Keep your security practice active this week.</div><div className="mt-1 text-[8px] leading-4 text-zinc-500">Your goal tracker stays tied to measurable activity.</div></div>
      </div>
    </WindowChrome>
  );
}

function FinalScreen() {
  return (
    <div className="relative h-full overflow-hidden rounded-[22px] border border-violet-400/20 bg-[radial-gradient(circle_at_50%_35%,rgba(139,92,246,.22),transparent_34%),#080a0f] p-5 sm:p-8">
      <div className="absolute inset-0 opacity-[.035] [background-image:linear-gradient(rgba(255,255,255,.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.8)_1px,transparent_1px)] [background-size:34px_34px]" />
      <div className="relative flex h-full flex-col items-center justify-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-400/30 bg-violet-500/10 shadow-[0_0_50px_rgba(139,92,246,.2)]"><Sparkles className="h-7 w-7 text-violet-300" /></div>
        <div className="mt-5 text-[9px] font-semibold uppercase tracking-[.2em] text-violet-300">Your developer intelligence layer</div>
        <h3 className="mt-3 max-w-lg text-2xl font-bold tracking-tight text-white sm:text-3xl">Stop checking seven dashboards. Start seeing one story.</h3>
        <p className="mt-3 max-w-md text-[10px] leading-5 text-zinc-500 sm:text-xs">Connect your real tools, keep your data private, track progress over time, and build a developer profile that actually reflects the work you do.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2 text-[8px] text-zinc-500"><span className="rounded-full border border-white/[.08] bg-white/[.025] px-3 py-1.5">Real activity</span><span className="rounded-full border border-white/[.08] bg-white/[.025] px-3 py-1.5">Private by default</span><span className="rounded-full border border-white/[.08] bg-white/[.025] px-3 py-1.5">Free beta</span></div>
        <Link to="/signup" className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-xs font-semibold text-black transition duration-300 hover:scale-[1.03] hover:bg-zinc-200 hover:shadow-xl hover:shadow-violet-500/20">Create your APIVue <ArrowRight className="h-4 w-4" /></Link>
      </div>
    </div>
  );
}

function ScreenPreview({ index }: { index: number }) {
  if (index === 0) return <NetworkScreen />;
  if (index === 1) return <ProgressScreen />;
  if (index === 2) return <ExploreScreen />;
  if (index === 3) return <CompareScreen />;
  if (index === 4) return <IntegrationsScreen />;
  if (index === 5) return <GoalsScreen />;
  return <FinalScreen />;
}

export function InteractiveProductDemo() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
      if (!open) return;
      if (event.key === 'ArrowRight') setStep((value) => Math.min(screens.length - 1, value + 1));
      if (event.key === 'ArrowLeft') setStep((value) => Math.max(0, value - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest('button');
      if (!button || !button.textContent?.includes('See interactive demo')) return;
      event.preventDefault();
      event.stopPropagation();
      setStep(0);
      setOpen(true);
    };
    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, []);

  useEffect(() => {
    if (!open || paused) return;
    const timer = window.setInterval(() => setStep((value) => (value + 1) % screens.length), 6500);
    return () => window.clearInterval(timer);
  }, [open, paused]);

  if (!open) return null;

  const current = screens[step];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-3 backdrop-blur-xl sm:p-6" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="relative flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#090c12] shadow-[0_30px_120px_rgba(0,0,0,.65)]">
        <div className="flex shrink-0 items-center justify-between border-b border-white/[.07] px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-center gap-3"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-violet-400/25 bg-violet-500/10"><Sparkles className="h-4 w-4 text-violet-300" /></div><div className="min-w-0"><div className="text-[10px] font-semibold uppercase tracking-[.18em] text-violet-300">Interactive APIVue demo</div><div className="truncate text-xs text-zinc-500">Click through the product before you create an account.</div></div></div>
          <button onClick={() => setOpen(false)} aria-label="Close demo" className="rounded-xl p-2 text-zinc-500 transition hover:bg-white/[.06] hover:text-white"><X className="h-4 w-4" /></button>
        </div>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1.5fr)_360px]">
          <div className="min-h-0 border-b border-white/[.07] p-3 sm:p-5 lg:border-b-0 lg:border-r" key={step}>
            <div className="h-full min-h-[350px] animate-[demoEnter_.55s_ease-out] sm:min-h-[470px] lg:min-h-[520px]"><ScreenPreview index={step} /></div>
          </div>
          <div className="flex min-h-0 flex-col p-4 sm:p-6">
            <div className="flex-1">
              <div className="flex items-center justify-between"><span className="text-[9px] font-semibold uppercase tracking-[.2em] text-violet-400">Screen {current.eyebrow} / {screens.length}</span><span className="text-[9px] text-zinc-600">{paused ? 'Paused' : 'Auto preview'}</span></div>
              <h2 className="mt-4 text-2xl font-bold tracking-tight text-white sm:text-3xl">{current.title}</h2>
              <p className="mt-3 text-xs leading-6 text-zinc-500">{step === 0 ? 'Connect the places where you already build, solve, learn and practice. APIVue becomes the layer between all of them.' : step === 1 ? 'Progress becomes more useful when it includes consistency, history and movement—not just a single total.' : step === 2 ? 'Explore turns your connected activity into areas, signals and useful places to focus next.' : step === 3 ? 'Compare development patterns and shared metrics while keeping the context behind the numbers visible.' : step === 4 ? 'Your platforms stay independent. APIVue normalizes the activity so you can understand it together.' : step === 5 ? 'Goals connect intention to measurable activity, so progress can move with the work you actually do.' : 'This is the product you are building toward: one private, living view of your developer journey.'}</p>
              <div className="mt-5 space-y-2">{[step === 0 ? 'Connect your ecosystem' : 'Real activity, not vanity metrics', step < 4 ? 'Interactive history and context' : 'Private profile + progress controls', 'Built to grow with you'].map((item) => <div key={item} className="flex items-center gap-2 text-[10px] text-zinc-400"><Check className="h-3.5 w-3.5 text-emerald-400" />{item}</div>)}</div>
            </div>

            <div className="mt-6 shrink-0">
              <div className="mb-3 grid grid-cols-7 gap-1.5">{screens.map((screen, index) => <button key={screen.label} aria-label={`Open ${screen.label} screen`} onClick={() => setStep(index)} className={`group relative h-8 rounded-lg border text-[8px] transition duration-300 ${index === step ? 'border-violet-400/35 bg-violet-500/12 text-violet-200' : 'border-white/[.06] bg-white/[.02] text-zinc-600 hover:border-white/[.12] hover:text-zinc-300'}`}><span className="hidden sm:block">{screen.label}</span><span className="sm:hidden">{screen.eyebrow}</span></button>)}</div>
              <div className="mb-4 h-1 overflow-hidden rounded-full bg-white/[.06]"><div className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-400 to-orange-300 transition-all duration-500" style={{ width: `${((step + 1) / screens.length) * 100}%` }} /></div>
              <div className="flex items-center justify-between gap-2"><button onClick={() => setStep((value) => Math.max(0, value - 1))} disabled={step === 0} className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/[.08] bg-white/[.025] px-3 text-[10px] font-medium text-zinc-400 transition hover:bg-white/[.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"><ArrowLeft className="h-3.5 w-3.5" /> Back</button>{step === screens.length - 1 ? <Link to="/signup" onClick={() => setOpen(false)} className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-[10px] font-semibold text-black transition duration-300 hover:scale-[1.02] hover:bg-zinc-200 hover:shadow-lg hover:shadow-violet-500/20">Create account <ArrowRight className="h-3.5 w-3.5" /></Link> : <button onClick={() => setStep((value) => Math.min(screens.length - 1, value + 1))} className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-[10px] font-semibold text-black transition duration-300 hover:scale-[1.02] hover:bg-zinc-200">Next <ArrowRight className="h-3.5 w-3.5" /></button>}</div>
              <div className="mt-4 flex items-center justify-center gap-2 text-[8px] text-zinc-600"><Lock className="h-3 w-3" /> Your connected data remains private</div>
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes demoEnter { from { opacity: 0; transform: translateY(10px) scale(.985); } to { opacity: 1; transform: translateY(0) scale(1); } } @media (prefers-reduced-motion: reduce) { .animate-\[demoEnter_\.55s_ease-out\] { animation: none !important; } }`}</style>
    </div>
  );
}
