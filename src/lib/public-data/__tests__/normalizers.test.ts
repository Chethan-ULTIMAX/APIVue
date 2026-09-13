import { describe, expect, it } from 'vitest';
import { normalizeGitHubData } from '../normalizers/github';
import { normalizeCodeforcesData } from '../normalizers/codeforces';
import { normalizeLeetCodeData } from '../normalizers/leetcode';
import { normalizeCodewarsData } from '../normalizers/codewars';
import { normalizeStackOverflowData } from '../normalizers/stackoverflow';

describe('public-data normalizers', () => {
  it('normalizes GitHub public data', () => {
    const result = normalizeGitHubData({
      user: { login: 'octocat', id: 1, name: 'Octo', avatar_url: 'a', html_url: 'u', bio: null, company: null, blog: null, location: 'Earth', twitter_username: null, created_at: '2020-01-01T00:00:00Z', updated_at: '2020-01-01T00:00:00Z', public_repos: 2, public_gists: 1, followers: 3, following: 4 },
      repos: [{ id: 1, name: 'hello', full_name: 'octocat/hello', html_url: 'u', description: 'x', language: 'TypeScript', stargazers_count: 5, forks_count: 2, open_issues_count: 1, size: 1, fork: false, archived: false, topics: ['api'], default_branch: 'main', created_at: '2020-01-01', updated_at: '2020-01-01', pushed_at: '2020-01-02' }],
      events: [{ id: '1', type: 'PushEvent', created_at: '2020-01-02T00:00:00Z', repo: { name: 'octocat/hello' }, payload: { size: 1 } }],
    });
    expect(result.platform).toBe('github');
    expect(result.metrics.some((metric) => metric.label === 'Total stars' && metric.value === 5)).toBe(true);
    expect(result.repositories?.[0]?.name).toBe('hello');
  });

  it('normalizes Codeforces public data', () => {
    const result = normalizeCodeforcesData({
      user: { handle: 'tourist', contribution: 10, rating: 3500, maxRating: 3900, rank: 'legendary grandmaster', maxRank: 'legendary grandmaster', lastOnlineTimeSeconds: 1, registrationTimeSeconds: 1, friendOfCount: 2 },
      ratings: [{ contestId: 1, contestName: 'Test', handle: 'tourist', rank: 1, ratingUpdateTimeSeconds: 2, oldRating: 3400, newRating: 3500 }],
      submissions: [{ id: 1, contestId: 1, creationTimeSeconds: 2, relativeTimeSeconds: 1, problem: { contestId: 1, index: 'A', name: 'A', type: 'PROGRAMMING', tags: ['math'] }, verdict: 'OK', programmingLanguage: 'C++' }],
    });
    expect(result.profile.username).toBe('tourist');
    expect(result.activity).toHaveLength(1);
    expect(result.breakdowns?.[0]?.items[0]?.label).toBe('math');
  });

  it('normalizes LeetCode public data', () => {
    const result = normalizeLeetCodeData({
      matchedUser: { username: 'alice', profile: { realName: 'Alice', userAvatar: null, ranking: 42, aboutMe: 'hi', countryName: 'IN', reputation: 3 }, submitStatsGlobal: { acSubmissionNum: [{ difficulty: 'All', count: 10 }, { difficulty: 'Easy', count: 5 }, { difficulty: 'Medium', count: 4 }, { difficulty: 'Hard', count: 1 }] }, languageProblemCount: [{ languageName: 'Python', problemsSolved: 10 }], submissionCalendar: '{"1700000000":2}', badges: [{ displayName: 'Badge' }] },
      userContestRanking: { attendedContestsCount: 2, rating: 1500, globalRanking: 100, topPercentage: 5 },
      allQuestionsCount: [{ difficulty: 'All', count: 20 }, { difficulty: 'Easy', count: 10 }, { difficulty: 'Medium', count: 7 }, { difficulty: 'Hard', count: 3 }],
    });
    expect(result.metrics.find((metric) => metric.label === 'Problems solved')?.value).toBe(10);
    expect(result.breakdowns).toHaveLength(2);
    expect(result.activity).toHaveLength(1);
  });

  it('normalizes Codewars public data', () => {
    const result = normalizeCodewarsData({ username: 'alice', name: 'Alice', honor: 100, ranks: { overall: { rank: -3, name: '3 kyu', score: 500, color: 'blue' }, languages: { javascript: { rank: -4, name: '4 kyu', score: 300, color: 'blue' } } }, codeChallenges: { totalCompleted: 20, totalAuthored: 2 }, leaderboardPosition: 50, country: 'IN' });
    expect(result.metrics.find((metric) => metric.label === 'Honor')?.value).toBe(100);
    expect(result.breakdowns?.[0]?.items[0]?.label).toBe('javascript');
  });

  it('normalizes Stack Overflow public data', () => {
    const result = normalizeStackOverflowData({ user: { user_id: 123, display_name: 'Alice', profile_image: 'a', link: 'u', location: 'IN', reputation: 100, badge_counts: { gold: 1, silver: 2, bronze: 3 }, answer_count: 4, question_count: 5, view_count: 6, creation_date: 1 }, tags: [{ tag_name: 'typescript', answer_count: 2, answer_score: 10 }] });
    expect(result.profile.username).toBe('123');
    expect(result.metrics.find((metric) => metric.label === 'Reputation')?.value).toBe(100);
    expect(result.breakdowns?.[0]?.items[0]?.label).toBe('typescript');
  });
});
