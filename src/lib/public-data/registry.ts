import type { PublicDataResult, PublicPlatform } from './types';
import { fetchGitHubPublicProfile } from './fetchers/github';
import { fetchCodeforcesPublicProfile } from './fetchers/codeforces';
import { fetchLeetCodePublicProfile } from './fetchers/leetcode';
import { fetchCodewarsPublicProfile } from './fetchers/codewars';
import { fetchStackOverflowPublicProfile } from './fetchers/stackoverflow';
import { normalizeGitHubData } from './normalizers/github';
import { normalizeCodeforcesData } from './normalizers/codeforces';
import { normalizeLeetCodeData } from './normalizers/leetcode';
import { normalizeCodewarsData } from './normalizers/codewars';
import { normalizeStackOverflowData } from './normalizers/stackoverflow';

export interface PublicPlatformDefinition {
  id: PublicPlatform;
  name: string;
  description: string;
  placeholder: string;
  fetch: (username: string) => Promise<PublicDataResult>;
}

export const publicPlatformRegistry: Record<PublicPlatform, PublicPlatformDefinition> = {
  github: {
    id: 'github', name: 'GitHub', description: 'Explore publicly available GitHub activity.', placeholder: 'GitHub username or profile URL',
    fetch: async (username) => normalizeGitHubData(await fetchGitHubPublicProfile(username)),
  },
  codeforces: {
    id: 'codeforces', name: 'Codeforces', description: 'Explore public competitive-programming activity.', placeholder: 'Codeforces handle or profile URL',
    fetch: async (username) => normalizeCodeforcesData(await fetchCodeforcesPublicProfile(username)),
  },
  leetcode: {
    id: 'leetcode', name: 'LeetCode', description: 'Explore publicly available LeetCode activity.', placeholder: 'LeetCode username or profile URL',
    fetch: async (username) => normalizeLeetCodeData(await fetchLeetCodePublicProfile(username)),
  },
  codewars: {
    id: 'codewars', name: 'Codewars', description: 'Explore publicly available Codewars activity.', placeholder: 'Codewars username or profile URL',
    fetch: async (username) => normalizeCodewarsData(await fetchCodewarsPublicProfile(username)),
  },
  stackoverflow: {
    id: 'stackoverflow', name: 'Stack Overflow', description: 'Explore publicly available Stack Overflow activity.', placeholder: 'Stack Overflow user ID or profile URL',
    fetch: async (userId) => normalizeStackOverflowData(await fetchStackOverflowPublicProfile(userId)),
  },
};

export function getPublicPlatform(platform: PublicPlatform): PublicPlatformDefinition {
  const definition = publicPlatformRegistry[platform];
  if (!definition) throw new Error(`Unsupported public platform: ${platform}`);
  return definition;
}
