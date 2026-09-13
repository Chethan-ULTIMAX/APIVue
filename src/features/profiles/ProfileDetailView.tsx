import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useProfileSnapshots, useSyncProfile, useTrackedProfiles } from '@/hooks/use-profiles';
import { GitHubProfileView } from './GitHubProfileView';
import { CompetitiveProfileView } from './CompetitiveProfileView';
import { CommunityProfileView } from './CommunityProfileView';
import { SecurityProfileView } from './SecurityProfileView';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function ProfileDetailView() {
 const {id}=useParams<{id:string}>(); const {data:profiles=[],isLoading,refetch}=useTrackedProfiles(); const {data:snapshots=[]}=useProfileSnapshots(id); const sync=useSyncProfile(); const profile=profiles.find(x=>x.id===id); const [liveMeta,setLiveMeta]=useState<Record<string,unknown>|null>(null); const [refreshing,setRefreshing]=useState(false);
 useEffect(()=>{if(!profile||profile.platform!=='github')return;let cancelled=false;fetch(`https://api.github.com/users/${encodeURIComponent(profile.handle)}`,{headers:{Accept:'application/vnd.github+json'}}).then(r=>r.ok?r.json() as Promise<Record<string,unknown>>:null).then(v=>{if(!cancelled&&v)setLiveMeta(v)}).catch(()=>undefined);return()=>{cancelled=true}},[profile?.handle,profile?.platform]);
 if(isLoading)return <div className="p-6"><div className="mx-auto max-w-7xl animate-pulse space-y-5"><div className="h-32 rounded-3xl bg-muted"/><div className="h-72 rounded-3xl bg-muted"/></div></div>;
 if(!profile)return <div className="p-6"><Card><CardContent className="p-10 text-center"><p className="font-semibold">Profile not found</p><Link to="/dashboard/profiles"><Button className="mt-4" variant="outline"><ArrowLeft className="mr-2 h-4 w-4"/>Back to profiles</Button></Link></CardContent></Card></div>;
 const refresh=async()=>{setRefreshing(true);try{await sync.mutateAsync({platform:profile.platform,handle:profile.handle});await refetch()}finally{setRefreshing(false)}};
 if(profile.platform==='github')return <GitHubProfileView profile={profile} snapshots={snapshots} liveMeta={liveMeta} refreshing={refreshing} onRefresh={()=>void refresh}/>;
 if(profile.platform==='leetcode'||profile.platform==='codeforces')return <CompetitiveProfileView profile={profile} snapshots={snapshots} refreshing={refreshing} onRefresh={()=>void refresh}/>;
 if(profile.platform==='codewars'||profile.platform==='stackoverflow')return <CommunityProfileView profile={profile} snapshots={snapshots} refreshing={refreshing} onRefresh={()=>void refresh}/>;
 if(profile.platform==='tryhackme'||profile.platform==='hackthebox')return <SecurityProfileView profile={profile} snapshots={snapshots} refreshing={refreshing} onRefresh={()=>void refresh}/>;
 return <div className="p-6"><Card><CardContent className="p-10"><Link to="/dashboard/profiles" className="text-sm text-muted-foreground">← Profiles</Link><h1 className="mt-5 text-2xl font-bold">{profile.displayName||profile.handle}</h1><p className="mt-1 text-muted-foreground">@{profile.handle}</p></CardContent></Card></div>;
}
