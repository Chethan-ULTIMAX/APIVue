import { supabase } from '@/integrations/supabase/client';

/**
 * LeetCode public profile fetcher.
 *
 * LeetCode's GraphQL endpoint is not reliable for browser-side requests.
 * APIVue therefore calls its public Supabase Edge Function proxy, which
 * fetches the same public GraphQL data server-side and returns it here.
 */

export interface RawLeetCodeDifficultyCount {
  difficulty: string;
  count: number;
  submissions?: number;
}

export interface RawLeetCodeLanguageCount {
  languageName: string;
  problemsSolved: number;
}

export interface RawLeetCodeBadge {
  displayName: string;
}

export interface RawLeetCodeMatchedUser {
  username: string;
  profile: {
    realName: string | null;
    userAvatar: string | null;
    ranking: number | null;
    aboutMe: string | null;
    countryName: string | null;
    reputation: number;
  };
  submitStatsGlobal: {
    acSubmissionNum: RawLeetCodeDifficultyCount[];
  };
  languageProblemCount: RawLeetCodeLanguageCount[];
  submissionCalendar: string | null;
  badges: RawLeetCodeBadge[] | null;
}

export interface RawLeetCodeContestRanking {
  attendedContestsCount: number;
  rating: number;
  globalRanking: number;
  topPercentage: number;
}

export interface RawLeetCodeData {
  matchedUser: RawLeetCodeMatchedUser | null;
  userContestRanking: RawLeetCodeContestRanking | null;
  allQuestionsCount: RawLeetCodeDifficultyCount[];
  userContestRankingHistory?: Array<{
    attended: boolean;
    rating: number;
    ranking: number;
    contest: { title: string; startTime: number };
  }>;
}

export async function fetchLeetCodePublicProfile(
  username: string,
): Promise<RawLeetCodeData> {
  const cleanUsername = username.trim();
  if (!cleanUsername) throw new Error('Enter a LeetCode username.');

  const { data, error } = await supabase.functions.invoke('public-profile', {
    body: { provider: 'leetcode', handle: cleanUsername },
  });

  if (error) {
    let message = error.message;
    const context = (error as { context?: { json?: () => Promise<unknown> } }).context;
    if (context?.json) {
      try {
        const body = await context.json() as { error?: string };
        if (body?.error) message = body.error;
      } catch { /* keep the SDK message */ }
    }
    throw new Error(message || 'LeetCode public data request failed.');
  }

  const payload = data as { error?: string; data?: RawLeetCodeData } | null;
  if (payload?.error) throw new Error(payload.error);
  if (!payload?.data?.matchedUser) throw new Error('LeetCode user not found.');

  return payload.data;
}
