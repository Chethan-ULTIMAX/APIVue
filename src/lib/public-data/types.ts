/** Public-data layer types. */
export type PublicPlatform = 'github' | 'codeforces' | 'leetcode' | 'codewars' | 'stackoverflow';
export interface PublicProfile { platform: PublicPlatform; username: string; displayName: string | null; avatarUrl: string | null; profileUrl: string; bio: string | null; location: string | null; joinedAt: string | null; }
export interface PublicMetric { label: string; value: string | number; description?: string; }
export interface PublicBreakdown { label: string; items: Array<{ label: string; value: number; percentage?: number }>; }
export interface PublicRepository { name: string; url: string; description: string | null; language: string | null; stars: number; forks: number; openIssues: number; isFork: boolean; isArchived: boolean; topics: string[]; updatedAt: string | null; }
export interface PublicActivity { id: string; title: string; description?: string; timestamp: string; url?: string; type: string; }
export interface GitHubContributionDay { date: string; count: number; level: 0 | 1 | 2 | 3 | 4; }
export interface GitHubContributionAnalytics { days: GitHubContributionDay[]; totalContributions: number; totalCommits: number | null; totalIssues: number | null; totalPullRequests: number | null; totalReviews: number | null; totalDiscussions: number | null; activeDays: number; }
export interface PublicDataResult { platform: PublicPlatform; profile: PublicProfile; metrics: PublicMetric[]; activity: PublicActivity[]; breakdowns?: PublicBreakdown[]; repositories?: PublicRepository[]; ratingHistory?: Array<{ date: string; value: number }>; githubContributions?: GitHubContributionAnalytics; fetchedAt: string; source: 'public-api'; }
export interface PublicDataFetcher { platform: PublicPlatform; fetchProfile(username: string): Promise<PublicDataResult>; }
