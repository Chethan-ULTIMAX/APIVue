import { useEffect, useMemo, useState } from 'react';
import { Activity, CalendarClock, Check, ChevronDown, CirclePause, Flame, Lightbulb, Plus, RefreshCw, Sparkles, Target, Trash2, Trophy, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { useCreateGoal, useDeleteGoal, useGoals, useUpdateGoal } from '@/hooks/use-goals';
import { useProfileSnapshots, useTrackedProfiles } from '@/hooks/use-profiles';
import { calculateAllGoalsProgress, generateGoalActions, getGoalsSummary, suggestNewGoals, type GoalProgress } from '@/lib/analytics/goals';
import { getGoalTrackerOptions, getGoalTracking, inferLegacyTracking, resolveGoalValue, trackingId, type GoalTracking } from '@/lib/analytics/goal-tracking';
import type { Goal } from '@/hooks/use-goals';

const STATUS_STYLES = {
  completed: 'border-emerald-500/30 bg-emerald-500/[0.06] text-emerald-700 dark:text-emerald-300',
  'on-track': 'border-primary/20 bg-primary/[0.04] text-primary',
  behind: 'border-orange-500/30 bg-orange-500/[0.06] text-orange-700 dark:text-orange-300',
  paused: 'border-muted-foreground/20 bg-muted/50 text-muted-foreground',
  cancelled: 'border-destructive/20 bg-destructive/[0.04] text-destructive',
} as const;

function formatNumber(value: number) { return new Intl.NumberFormat().format(Math.round(value)); }
function trackingLabel(goal: Goal): string { const t = getGoalTracking(goal) ?? null; if (!t) return 'Manual'; if (t.mode === 'streak') return 'Current streak'; if (t.mode === 'activity') return t.period === 'daily' ? 'Daily activity' : 'Recorded activity'; return `${t.metricKey ?? 'Profile metric'}`; }
function percent(value: number) { return Math.max(0, Math.min(100, value)); }

export function GoalsView() {
  const goalsQuery = useGoals();
  const profilesQuery = useTrackedProfiles();
  const snapshotsQuery = useProfileSnapshots();
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();

  const goals = goalsQuery.data ?? [];
  const profiles = profilesQuery.data ?? [];
  const snapshots = snapshotsQuery.data ?? [];
  const trackerOptions = useMemo(() => getGoalTrackerOptions(profiles), [profiles]);
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('');
  const [unit, setUnit] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [tracker, setTracker] = useState('activity:daily');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'paused'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const goalsProgress = useMemo(() => calculateAllGoalsProgress(goals, profiles, snapshots), [goals, profiles, snapshots]);
  const summary = useMemo(() => getGoalsSummary(goalsProgress), [goalsProgress]);
  const actions = useMemo(() => generateGoalActions(goalsProgress), [goalsProgress]);
  const suggestions = useMemo(() => suggestNewGoals(profiles, snapshots, goals), [profiles, snapshots, goals]);
  const filtered = useMemo(() => goalsProgress.filter((g) => filter === 'all' || (filter === 'active' && (g.status === 'on-track' || g.status === 'behind')) || g.status === filter), [filter, goalsProgress]);
  const isLoading = goalsQuery.isLoading || profilesQuery.isLoading || snapshotsQuery.isLoading;

  // Persist only values that are actually derived from collected data. Daily goals keep their DB status active so they can complete again tomorrow.
  useEffect(() => {
    if (!goals.length || !profiles.length) return;
    for (const progress of goalsProgress) {
      const goal = progress.goal;
      if (goal.status === 'paused' || goal.status === 'cancelled') continue;
      const explicit = getGoalTracking(goal);
      const inferred = explicit ?? inferLegacyTracking(goal, profiles);
      if (!inferred) continue;
      const daily = inferred.period === 'daily';
      const nextStatus = daily ? (goal.status === 'completed' ? 'active' : goal.status) : progress.status === 'completed' ? 'completed' : goal.status;
      const trackingChanged = trackingId(explicit) !== trackingId(inferred);
      const valueChanged = Math.abs((goal.current_value ?? 0) - progress.currentValue) > 0.000001;
      const statusChanged = nextStatus !== goal.status && !(daily && progress.status === 'completed');
      if (trackingChanged || valueChanged || statusChanged) {
        void updateGoal.mutateAsync({ id: goal.id, current_value: progress.currentValue, metadata: { ...(goal.metadata ?? {}), tracking: inferred }, status: nextStatus as Goal['status'] }).catch(() => undefined);
      }
    }
  }, [goalsProgress, profiles, goals.length]);

  const resetCreate = () => { setTitle(''); setTarget(''); setUnit(''); setTargetDate(''); setTracker(trackerOptions[0]?.id ?? 'activity:daily'); };
  const buildTracking = (id: string, forGoal?: Goal): GoalTracking => {
    const option = trackerOptions.find((x) => x.id === id);
    if (!option) return { mode: 'activity', period: 'daily' };
    const baseline = option.mode === 'metric' ? option.value : undefined;
    return { mode: option.mode, period: option.period, profileId: option.profileId, metricKey: option.metricKey, baseline: forGoal ? getGoalTracking(forGoal)?.baseline ?? baseline : baseline };
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    const selected = trackerOptions.find((x) => x.id === tracker);
    try {
      await createGoal.mutateAsync({ title: title.trim(), target_value: target ? Math.max(0, Number(target)) : null, unit: unit.trim() || selected?.unit || undefined, target_date: targetDate || undefined, metadata: { tracking: buildTracking(tracker) } });
      resetCreate(); setShowCreate(false); toast({ title: 'Goal created', description: 'Progress will update from your real data.' });
    } catch (error) { toast({ title: 'Could not create goal', description: (error as Error).message, variant: 'destructive' }); }
  };

  const refresh = async () => { await Promise.all([goalsQuery.refetch(), profilesQuery.refetch(), snapshotsQuery.refetch()]); toast({ title: 'Goals refreshed', description: 'Progress was recalculated from the latest stored data.' }); };
  const setStatus = async (goal: Goal, status: Goal['status']) => { try { await updateGoal.mutateAsync({ id: goal.id, status }); toast({ title: status === 'completed' ? 'Goal marked complete' : status === 'active' ? 'Goal resumed' : `Goal ${status}` }); } catch (error) { toast({ title: 'Update failed', description: (error as Error).message, variant: 'destructive' }); } };
  const remove = async (goal: Goal) => { if (!window.confirm(`Delete “${goal.title}”? This cannot be undone.`)) return; try { await deleteGoal.mutateAsync(goal.id); toast({ title: 'Goal deleted' }); } catch (error) { toast({ title: 'Delete failed', description: (error as Error).message, variant: 'destructive' }); } };
  const saveEdit = async (goal: Goal, form: HTMLFormElement) => {
    const data = new FormData(form); const nextTarget = String(data.get('target') ?? '').trim(); const nextDate = String(data.get('targetDate') ?? '').trim(); const nextTracker = String(data.get('tracker') ?? tracker);
    try { await updateGoal.mutateAsync({ id: goal.id, target_value: nextTarget ? Math.max(0, Number(nextTarget)) : null, target_date: nextDate || null, metadata: { ...(goal.metadata ?? {}), tracking: buildTracking(nextTracker, goal) } }); setEditingId(null); toast({ title: 'Goal updated' }); } catch (error) { toast({ title: 'Update failed', description: (error as Error).message, variant: 'destructive' }); }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
      <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.06] px-2.5 py-1 text-[11px] font-medium text-primary"><Target className="h-3.5 w-3.5" /> Real progress tracking</div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Goals</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Turn your connected developer activity into measurable targets. Progress is recalculated from the latest profile data and snapshots.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={refresh} disabled={isLoading || goalsQuery.isFetching}><RefreshCw className={`mr-2 h-4 w-4 ${goalsQuery.isFetching ? 'animate-spin' : ''}`} />Refresh</Button>
            <Button onClick={() => { resetCreate(); setShowCreate(true); }}><Plus className="mr-2 h-4 w-4" />New goal</Button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Goals" value={summary.total} icon={<Target className="h-4 w-4" />} />
        <Stat label="Completed" value={summary.completed} icon={<Trophy className="h-4 w-4" />} />
        <Stat label="On track" value={summary.onTrack} icon={<Check className="h-4 w-4" />} />
        <Stat label="Needs attention" value={summary.behind} icon={<Activity className="h-4 w-4" />} />
        <Stat label="Average" value={`${summary.averageProgress}%`} icon={<Flame className="h-4 w-4" />} />
      </section>

      {showCreate && <Card className="border-primary/20 shadow-sm"><CardHeader><CardTitle className="flex items-center justify-between text-base"><span className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />Create a tracked goal</span><Button size="icon" variant="ghost" onClick={() => setShowCreate(false)}><X className="h-4 w-4" /></Button></CardTitle></CardHeader><CardContent><form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Field label="Goal"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Solve 50 problems" required /></Field>
        <Field label="Target"><Input type="number" min="0" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="50" /></Field>
        <Field label="Unit"><Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="problems" /></Field>
        <Field label="Target date"><Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} /></Field>
        <Field label="Track this from"><select value={tracker} onChange={(e) => setTracker(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"><option value="">Select tracker</option>{trackerOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select></Field>
        <div className="flex items-end gap-2 md:col-span-2 lg:col-span-5"><Button type="submit" disabled={createGoal.isPending || !title.trim()}>{createGoal.isPending ? 'Creating…' : 'Create goal'}</Button><Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button></div>
      </form></CardContent></Card>}

      <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex rounded-lg border border-border bg-muted/30 p-1">{(['all','active','completed','paused'] as const).map((item) => <button key={item} type="button" onClick={() => setFilter(item)} className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${filter===item?'bg-background text-foreground shadow-sm':'text-muted-foreground hover:text-foreground'}`}>{item}</button>)}</div>{suggestions.length > 0 && <Button variant="outline" size="sm" onClick={() => setShowSuggestions((v)=>!v)}><Lightbulb className="mr-2 h-3.5 w-3.5" />Suggestions <ChevronDown className={`ml-1 h-3.5 w-3.5 transition-transform ${showSuggestions?'rotate-180':''}`} /></Button>}</div>

      {showSuggestions && suggestions.length > 0 && <Card><CardHeader><CardTitle className="text-base">Suggestions from your real activity</CardTitle></CardHeader><CardContent className="grid gap-2 md:grid-cols-2">{suggestions.map((s,i)=><button key={`${s.title}-${i}`} type="button" onClick={()=>{setTitle(s.title);setTarget(String(s.target_value));setUnit(s.unit);setShowCreate(true);setShowSuggestions(false);}} className="rounded-xl border border-border bg-muted/20 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-muted/40"><p className="text-sm font-medium">{s.title}</p><p className="mt-1 text-xs text-muted-foreground">{s.description}</p></button>)}</CardContent></Card>}

      {actions.length > 0 && <section className="grid gap-3 md:grid-cols-2">{actions.slice(0,4).map((action)=><div key={action.id} className="rounded-xl border border-border bg-card p-4"><div className="flex items-start gap-3"><div className="rounded-lg bg-muted p-2"><Sparkles className="h-4 w-4" /></div><div><p className="text-sm font-medium">{action.title}</p><p className="mt-1 text-xs text-muted-foreground">{action.description}</p></div></div></div>)}</section>}

      {isLoading ? <div className="grid gap-4 md:grid-cols-2">{[1,2,3,4].map((n)=><Card key={n} className="animate-pulse"><CardContent className="space-y-4 p-6"><div className="h-5 w-1/2 rounded bg-muted"/><div className="h-2 rounded bg-muted"/><div className="h-4 w-1/3 rounded bg-muted"/></CardContent></Card>)}</div> : filtered.length === 0 ? <Card className="border-dashed"><CardContent className="flex flex-col items-center justify-center p-12 text-center"><Target className="h-10 w-10 text-muted-foreground/30"/><p className="mt-4 font-medium">{goals.length ? 'No goals in this filter' : 'No goals yet'}</p><p className="mt-1 max-w-md text-sm text-muted-foreground">{goals.length ? 'Try another status filter.' : 'Create your first tracked goal and APIVue will keep its progress tied to real developer data.'}</p></CardContent></Card> : <div className="grid gap-4 lg:grid-cols-2">{filtered.map((progress)=><GoalCard key={progress.goal.id} progress={progress} trackerOptions={trackerOptions} editing={editingId===progress.goal.id} onEdit={()=>setEditingId(progress.goal.id)} onCancelEdit={()=>setEditingId(null)} onSaveEdit={(form)=>saveEdit(progress.goal,form)} onStatus={(status)=>setStatus(progress.goal,status)} onDelete={()=>remove(progress.goal)} />)}</div>}

      <p className="text-center text-[11px] text-muted-foreground">Progress is calculated locally from stored APIVue profile data. No synthetic activity or invented metrics are used.</p>
    </div>
  );
}

function Stat({label,value,icon}:{label:string;value:string|number;icon:React.ReactNode}){return <Card className="overflow-hidden"><CardContent className="flex items-center gap-3 p-4"><div className="rounded-lg bg-muted p-2 text-muted-foreground">{icon}</div><div><p className="text-[11px] text-muted-foreground">{label}</p><p className="mt-0.5 text-xl font-semibold tracking-tight">{value}</p></div></CardContent></Card>}
function Field({label,children}:{label:string;children:React.ReactNode}){return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>}

function GoalCard({progress,trackerOptions,editing,onEdit,onCancelEdit,onSaveEdit,onStatus,onDelete}:{progress:GoalProgress;trackerOptions:ReturnType<typeof getGoalTrackerOptions>;editing:boolean;onEdit:()=>void;onCancelEdit:()=>void;onSaveEdit:(form:HTMLFormElement)=>void;onStatus:(status:Goal['status'])=>void;onDelete:()=>void}){
  const {goal}=progress; const auto=!!getGoalTracking(goal); const width=percent(progress.progressPercentage); const statusClass=STATUS_STYLES[progress.status];
  return <Card className="group overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"><div className="h-1 bg-muted"><div className="h-full bg-primary transition-all duration-500" style={{width:`${width}%`}}/></div><CardHeader className="pb-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><CardTitle className="text-base">{goal.title}</CardTitle><Badge variant="outline" className={statusClass}>{progress.status.replace('-', ' ')}</Badge></div><div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground"><span className="inline-flex items-center gap-1"><Activity className="h-3 w-3" />{trackingLabel(goal)}</span>{auto&&<span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-primary">AUTO</span>}{progress.daysRemaining!==undefined&&<span className="inline-flex items-center gap-1"><CalendarClock className="h-3 w-3" />{progress.daysRemaining>0?`${progress.daysRemaining}d left`:progress.daysRemaining===0?'Due today':'Past due'}</span>}</div></div><Button size="icon" variant="ghost" onClick={onEdit} className="shrink-0 opacity-70 hover:opacity-100"><ChevronDown className={`h-4 w-4 transition-transform ${editing?'rotate-180':''}`}/></Button></div></CardHeader><CardContent className="space-y-4 pt-0"><div><div className="mb-2 flex items-end justify-between"><div><span className="text-2xl font-semibold tabular-nums">{formatNumber(progress.currentValue)}</span><span className="ml-1 text-xs text-muted-foreground">{progress.unit??'value'}</span></div><span className="text-sm font-medium tabular-nums">{width}%</span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all duration-700" style={{width:`${width}%`}}/></div>{progress.targetValue!==null&&<p className="mt-1.5 text-[11px] text-muted-foreground">Target {formatNumber(progress.targetValue)} {progress.unit??''}</p>}</div>{progress.recommendations[0]&&<div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">{progress.recommendations[0]}</div>}
      <div className="flex flex-wrap gap-2"><Button size="sm" variant={goal.status==='completed'?'outline':'default'} onClick={()=>onStatus(goal.status==='completed'?'active':'completed')}>{goal.status==='completed'?<><RefreshCw className="mr-1.5 h-3.5 w-3.5"/>Reopen</>:<><Check className="mr-1.5 h-3.5 w-3.5"/>Mark complete</>}</Button>{goal.status==='paused'?<Button size="sm" variant="outline" onClick={()=>onStatus('active')}><RefreshCw className="mr-1.5 h-3.5 w-3.5"/>Resume</Button>:goal.status==='active'&&<Button size="sm" variant="outline" onClick={()=>onStatus('paused')}><CirclePause className="mr-1.5 h-3.5 w-3.5"/>Pause</Button>}<Button size="sm" variant="ghost" onClick={onDelete} className="ml-auto text-muted-foreground hover:text-destructive"><Trash2 className="mr-1.5 h-3.5 w-3.5"/>Delete</Button></div>
      {editing&&<form onSubmit={(e)=>{e.preventDefault();onSaveEdit(e.currentTarget)}} className="grid gap-3 rounded-xl border border-border bg-muted/20 p-3 sm:grid-cols-3"><Field label="Target"><Input name="target" type="number" min="0" defaultValue={goal.target_value??''}/></Field><Field label="Target date"><Input name="targetDate" type="date" defaultValue={goal.target_date?.slice(0,10)??''}/></Field><Field label="Tracker"><select name="tracker" defaultValue={trackingId(getGoalTracking(goal))} className="h-10 w-full rounded-md border border-input bg-background px-2 text-xs">{trackerOptions.map(o=><option key={o.id} value={o.id}>{o.label}</option>)}</select></Field><div className="flex gap-2 sm:col-span-3"><Button size="sm" type="submit">Save changes</Button><Button size="sm" type="button" variant="ghost" onClick={onCancelEdit}>Cancel</Button></div></form>}
    </CardContent></Card>
}
