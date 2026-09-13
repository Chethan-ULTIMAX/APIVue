import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Legend, Radar, RadarChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowRight, Check, GitCompareArrows, Info, Search, Sparkles, Users, X } from 'lucide-react';
import { useTrackedProfiles } from '@/hooks/use-profiles';
import { explorePublicProfile, type PublicDataResult, type PublicPlatform } from '@/lib/public-data';
import type { TrackedProfile } from '@/lib/integrations/registry';
import { formatNumber, platformLabel, numericMetrics } from '@/lib/analytics/dashboard-data';
import { getIntegration } from '@/lib/integrations/registry';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';

interface CompareProfile extends TrackedProfile { source: 'connected' | 'explored'; }

function publicToTracked(data: PublicDataResult): CompareProfile {
  return { id:`explored-${data.platform}-${data.profile.username}`, platform:data.platform, handle:data.profile.username, displayName:data.profile.displayName ?? data.profile.username, avatarUrl:data.profile.avatarUrl, profileUrl:data.profile.profileUrl, source:'explored', data:{ bio:data.profile.bio ?? undefined, location:data.profile.location ?? undefined, joinedAt:data.profile.joinedAt ?? undefined, metrics:data.metrics.map((m)=>({key:m.label.toLowerCase().replace(/[^a-z0-9]+/g,'_'),label:m.label,value:m.value})), activity:data.activity.map((item)=>({date:item.timestamp.slice(0,10),count:1})), breakdowns:(data.breakdowns ?? []).map((b)=>({key:b.label,label:b.label,items:b.items})) } };
}

function valueFor(profile: CompareProfile, key: string) {
  const metric = profile.data?.metrics?.find((item)=>item.key===key);
  return metric && typeof metric.value === 'number' ? metric.value : null;
}

export function CompareView() {
  const location = useLocation();
  const { data: connected = [], isLoading } = useTrackedProfiles();
  const incoming = (location.state as { exploreProfile?: PublicDataResult } | null)?.exploreProfile;
  const [explored, setExplored] = useState<CompareProfile[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [platform, setPlatform] = useState<PublicPlatform>('github');
  const [handle, setHandle] = useState('');
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!incoming) return;
    const profile = publicToTracked(incoming);
    setExplored((current)=>current.some((item)=>item.id===profile.id)?current:[...current,profile]);
    setSelectedIds((current)=>current.includes(profile.id)?current:[profile.id,...current]);
  }, [incoming]);

  const profiles = useMemo<CompareProfile[]>(() => [...connected.map((profile)=>({...profile,source:'connected' as const})),...explored], [connected,explored]);
  const selected = useMemo(()=>profiles.filter((profile)=>selectedIds.includes(profile.id)),[profiles,selectedIds]);
  const sharedMetrics = useMemo(()=>{
    const counts = new Map<string,{label:string,hits:number}>();
    selected.forEach((profile)=>numericMetrics(profile).forEach((metric)=>{const current=counts.get(metric.key);counts.set(metric.key,{label:metric.label,hits:(current?.hits ?? 0)+1});}));
    return Array.from(counts.entries()).filter(([,value])=>value.hits===selected.length).map(([key,value])=>({key,label:value.label}));
  },[selected]);
  const tableRows = useMemo(()=>sharedMetrics.map((metric)=>({metric:metric.label,...Object.fromEntries(selected.map((profile)=>[profile.handle,valueFor(profile,metric.key) ?? 0]))})),[sharedMetrics,selected]);
  const radarRows = useMemo(()=>sharedMetrics.slice(0,6).map((metric)=>{const values=selected.map((profile)=>valueFor(profile,metric.key) ?? 0);const max=Math.max(...values,1);return {metric:metric.label,...Object.fromEntries(selected.map((profile,index)=>[profile.handle,Math.round((values[index]/max)*100)]))};}),[sharedMetrics,selected]);

  const addPublic = async () => {
    if (!handle.trim()) return;
    setSearching(true);
    try { const result=await explorePublicProfile(platform,handle.trim()); const profile=publicToTracked(result); setExplored((current)=>current.some((item)=>item.id===profile.id)?current:[...current,profile]); setSelectedIds((current)=>current.includes(profile.id)?current:[...current,profile.id]); setHandle(''); toast({title:'Profile added',description:`${profile.handle} is ready for comparison.`}); }
    catch(error){ toast({title:'Could not add profile',description:error instanceof Error?error.message:'Public lookup failed.',variant:'destructive'}); }
    finally{setSearching(false);}
  };

  const toggle=(id:string)=>setSelectedIds((current)=>current.includes(id)?current.filter((item)=>item!==id):[...current,id]);

  if (isLoading) return <div className="min-h-full p-5 sm:p-6 lg:p-8"><div className="mx-auto max-w-7xl animate-pulse space-y-5"><div className="h-9 w-64 rounded bg-muted"/><div className="h-16 rounded-2xl bg-muted"/><div className="h-72 rounded-2xl bg-muted"/></div></div>;

  return (
    <div className="relative min-h-full overflow-hidden"><div className="pointer-events-none absolute -right-40 top-0 h-96 w-96 rounded-full bg-blue-500/[0.06] blur-3xl"/><div className="relative mx-auto max-w-7xl space-y-6 p-5 sm:p-6 lg:p-8">
      <header><div className="mb-3 flex flex-wrap gap-2"><Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400"><GitCompareArrows className="mr-1.5 h-3 w-3"/> Comparison studio</Badge><Badge variant="outline">{selected.length} selected</Badge></div><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Compare exactly what you choose.</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">Mix connected profiles and public profiles. APIVue compares only shared numeric metrics and never invents a missing value.</p></header>

      <Card className="border-border bg-card/70"><CardContent className="p-5"><div className="grid gap-3 lg:grid-cols-[auto_1fr_auto]"><select value={platform} onChange={(event)=>setPlatform(event.target.value as PublicPlatform)} className="h-10 rounded-lg border border-border bg-background px-3 text-sm"><option value="github">GitHub</option><option value="codeforces">Codeforces</option><option value="leetcode">LeetCode</option><option value="codewars">Codewars</option><option value="stackoverflow">Stack Overflow</option></select><Input value={handle} onChange={(event)=>setHandle(event.target.value)} onKeyDown={(event)=>{if(event.key==='Enter')void addPublic();}} placeholder={platform==='stackoverflow'?'Numeric user ID':'Username / handle'} /><Button onClick={()=>void addPublic()} disabled={searching} className="gap-2"><Search className="h-4 w-4"/>{searching?'Adding…':'Add public profile'}</Button></div><div className="mt-4 flex flex-wrap gap-2">{profiles.length?profiles.map((profile)=>{const active=selectedIds.includes(profile.id);const Icon=getIntegration(profile.platform).icon;return <div key={profile.id} className="flex items-center"><button type="button" onClick={()=>toggle(profile.id)} className={`flex items-center gap-2 rounded-xl border px-3 py-2 transition ${active?'border-primary bg-primary/5':'border-border bg-background hover:border-primary/30'}`}><span className={`flex h-7 w-7 items-center justify-center rounded-lg ${active?'bg-primary/10 text-primary':'bg-muted text-muted-foreground'}`}><Icon className="h-3.5 w-3.5"/></span><span className="max-w-[170px] text-left"><span className="block truncate text-xs font-medium">{profile.displayName||profile.handle}</span><span className="block text-[10px] text-muted-foreground">{platformLabel(profile.platform)}</span></span>{active&&<Check className="h-3.5 w-3.5 text-primary"/>}</button>{profile.source==='explored'&&<button type="button" onClick={()=>{setExplored((current)=>current.filter((item)=>item.id!==profile.id));setSelectedIds((current)=>current.filter((id)=>id!==profile.id));}} className="ml-1 p-1 text-muted-foreground hover:text-destructive" aria-label={`Remove ${profile.handle}`}><X className="h-3 w-3"/></button>}</div>)}):<p className="py-4 text-xs text-muted-foreground">No profiles yet. Add a public profile or connect one from Integrations.</p>}</div></CardContent></Card>

      {selected.length<2 ? <Card className="border-dashed bg-card/40"><CardContent className="p-12 text-center"><Users className="mx-auto h-10 w-10 text-muted-foreground/40"/><h2 className="mt-4 font-semibold">Select at least two profiles</h2><p className="mx-auto mt-1 max-w-lg text-sm text-muted-foreground">You can compare two or more profiles across the same platform, or compare compatible metrics across platforms.</p></CardContent></Card> : <>
        <section className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-wider text-primary">01 · Results</p><h2 className="mt-1 text-xl font-semibold">{selected.length} profiles compared</h2></div><Badge variant="outline" className="gap-1.5"><Sparkles className="h-3 w-3"/>{sharedMetrics.length} shared numeric metrics</Badge></section>
        {sharedMetrics.length ? <>
          <Card className="border-border bg-card/80"><CardContent className="p-5 sm:p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Metric table</p><h3 className="mt-1 font-semibold">Side-by-side source values</h3></div><Badge variant="secondary">Real returned values</Badge></div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[620px] text-sm"><thead><tr className="border-b border-border text-left text-xs text-muted-foreground"><th className="px-3 py-3">Metric</th>{selected.map((profile)=><th key={profile.id} className="px-3 py-3 whitespace-nowrap">{profile.handle}</th>)}</tr></thead><tbody>{tableRows.map((row)=><tr key={row.metric} className="border-b border-border/60 last:border-0"><td className="px-3 py-3 font-medium">{row.metric}</td>{selected.map((profile)=><td key={profile.id} className="px-3 py-3 font-semibold">{formatNumber(Number(row[profile.handle] ?? 0))}</td>)}</tr>)}</tbody></table></div></CardContent></Card>
          <section className="grid gap-5 lg:grid-cols-[2fr_1fr]"><Card className="border-border bg-card/80"><CardContent className="p-5 sm:p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Visual comparison</p><h3 className="mt-1 font-semibold">Shared metric distribution</h3></div></div><div className="mt-5 h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={tableRows} layout="vertical" margin={{left:20,right:20}}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false}/><XAxis type="number" tick={{fontSize:10}}/><YAxis type="category" dataKey="metric" width={120} tick={{fontSize:10}}/><Tooltip contentStyle={{borderRadius:12,border:'1px solid hsl(var(--border))',background:'hsl(var(--card))'}}/><Legend/>{selected.map((profile,index)=><Bar key={profile.id} dataKey={profile.handle} fill={index===0?'hsl(var(--primary))':index%2?'hsl(199 89% 48%)':'hsl(280 67% 60%)'} radius={[0,4,4,0]}/>)}</BarChart></ResponsiveContainer></div></CardContent></Card><Card className="border-border bg-card/80"><CardContent className="p-5 sm:p-6"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Relative view</p><h3 className="mt-1 font-semibold">Normalized radar</h3><div className="mt-2 h-72"><ResponsiveContainer width="100%" height="100%"><RadarChart data={radarRows}><PolarGrid/><PolarAngleAxis dataKey="metric" tick={{fontSize:9}}/><PolarRadiusAxis tick={{fontSize:8}} domain={[0,100]}/>{selected.map((profile,index)=><Radar key={profile.id} name={profile.handle} dataKey={profile.handle} stroke={index===0?'hsl(var(--primary))':index%2?'hsl(199 89% 48%)':'hsl(280 67% 60%)'} fill="none"/>) }<Legend/></RadarChart></ResponsiveContainer></div></CardContent></Card></section>
        </> : <Card className="border-dashed bg-card/40"><CardContent className="p-10 text-center"><Info className="mx-auto h-7 w-7 text-muted-foreground/50"/><h3 className="mt-3 font-semibold">No shared numeric metrics</h3><p className="mx-auto mt-1 max-w-lg text-xs leading-5 text-muted-foreground">These profiles expose different metric names. Try profiles on the same platform or choose another public profile.</p></CardContent></Card>}
        <Card className="border-border bg-card/60"><CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center"><Info className="h-5 w-5 shrink-0 text-muted-foreground"/><div className="flex-1"><p className="text-sm font-medium">Comparison is intentionally conservative.</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Only metrics present on every selected profile are compared. A larger number is not automatically a better result because platforms measure different things.</p></div><Button variant="outline" size="sm" onClick={()=>setSelectedIds([])}>Reset selection</Button></CardContent></Card>
      </>}
    </div></div>
  );
}
