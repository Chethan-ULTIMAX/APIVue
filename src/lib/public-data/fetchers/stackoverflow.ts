/**
 * Stack Overflow public profile fetcher.
 *
 * The public Stack Exchange API identifies users by numeric user id. Explore
 * accepts either that id or a normal Stack Overflow /users/<id>/... URL.
 */

const STACKEXCHANGE_API = 'https://api.stackexchange.com/2.3';

export interface RawStackOverflowUser {
  user_id: number;
  display_name: string;
  profile_image?: string;
  link?: string;
  location?: string;
  reputation: number;
  badge_counts: { gold: number; silver: number; bronze: number };
  answer_count?: number;
  question_count?: number;
  up_vote_count?: number;
  down_vote_count?: number;
  view_count?: number;
  creation_date?: number;
}

export interface RawStackOverflowTag {
  tag_name: string;
  answer_count: number;
  answer_score: number;
}

export interface RawStackOverflowProfile {
  user: RawStackOverflowUser;
  tags: RawStackOverflowTag[];
}

interface StackExchangeEnvelope<T> {
  items: T[];
  error_id?: number;
  error_message?: string;
}

async function stackExchangeRequest<T>(path: string): Promise<T[]> {
  const response = await fetch(`${STACKEXCHANGE_API}${path}`);
  const payload = (await response.json()) as StackExchangeEnvelope<T>;

  if (!response.ok || payload.error_id) {
    if (response.status === 400 || response.status === 404) {
      throw new Error('Stack Overflow user not found.');
    }
    throw new Error(payload.error_message ?? `Stack Overflow request failed with status ${response.status}.`);
  }

  return payload.items ?? [];
}

function extractUserId(input: string): string {
  const value = input.trim();
  if (/^\d+$/.test(value)) return value;

  try {
    const url = new URL(value);
    const match = url.pathname.match(/\/users\/(\d+)/i);
    if (match?.[1]) return match[1];
  } catch {
    // Fall through to the friendly validation error.
  }

  throw new Error('Stack Overflow needs a numeric user ID or a Stack Overflow profile URL.');
}

export async function fetchStackOverflowPublicProfile(input: string): Promise<RawStackOverflowProfile> {
  const userId = extractUserId(input);
  const [userItems, tagItems] = await Promise.all([
    // Do not add filter=default here. The documented public endpoint without a
    // filter returns the same user envelope used by Stack Overflow itself.
    stackExchangeRequest<RawStackOverflowUser>(`/users/${userId}?site=stackoverflow`),
    stackExchangeRequest<RawStackOverflowTag>(`/users/${userId}/top-answer-tags?site=stackoverflow&pagesize=10`).catch(
      () => [] as RawStackOverflowTag[],
    ),
  ]);

  const user = userItems.find((item) => item.user_id === Number(userId));
  if (!user) throw new Error('Stack Overflow user not found.');

  return { user, tags: tagItems };
}
