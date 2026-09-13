import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ProfileDetailView } from './ProfileDetailView';
import { GitHubProfileView } from './GitHubProfileView';
import { useProfileSnapshots, useSyncProfile, useTrackedProfiles } from '@/hooks/use-profiles';

export function UnifiedProfileDetailView() {
  const { id } = useParams<{ id: string }>();
  const { data: profiles = [], refetch } = useTrackedProfiles();
  const { data: snapshots = [] } = useProfileSnapshots(id);
  const sync = useSyncProfile();
  const profile = profiles.find((item) => item.id === id);
  const [liveMeta, setLiveMeta] = useState<Record<string, unknown> | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!profile || profile.platform !== 'github') return;
    let cancelled = false;
    fetch(`https://api.github.com/users/${encodeURIComponent(profile.handle)}`, { headers: { Accept: 'application/vnd.github+json' } })
      .then(async (response) => response.ok ? response.json() as Promise<Record<string, unknown>> : null)
      .then((value) => { if (!cancelled && value) setLiveMeta(value); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [profile?.handle, profile?.platform]);

  if (!profile || profile.platform !== 'github') return <ProfileDetailView />;

  const onRefresh = async () => {
    setRefreshing(true);
    try { await sync.mutateAsync({ platform: profile.platform, handle: profile.handle }); await refetch(); }
    finally { setRefreshing(false); }
  };

  return <GitHubProfileView profile={profile} snapshots={snapshots} liveMeta={liveMeta} refreshing={refreshing} onRefresh={() => void onRefresh()} />;
}
