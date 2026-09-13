import { supabase } from '@/integrations/supabase/client';

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

function extractUserId(input: string): string {
  const value = input.trim();
  if (/^\d+$/.test(value)) return value;
  try {
    const url = new URL(value);
    const match = url.pathname.match(/\/users\/(\d+)/i);
    if (match?.[1]) return match[1];
  } catch {}
  throw new Error('Stack Overflow needs a numeric user ID or a Stack Overflow profile URL.');
}

export async function fetchStackOverflowPublicProfile(input: string): Promise<RawStackOverflowProfile> {
  const userId = extractUserId(input);
  const { data, error } = await supabase.functions.invoke('public-profile', {
    body: { provider: 'stackoverflow', handle: userId },
  });
  if (error) {
    let message = error.message;
    const context = (error as { context?: { json?: () => Promise<unknown> } }).context;
    if (context?.json) {
      try {
        const body = await context.json() as { error?: string };
        if (body?.error) message = body.error;
      } catch {}
    }
    throw new Error(message || 'Stack Overflow public data request failed.');
  }
  const payload = data as { error?: string; data?: RawStackOverflowProfile } | null;
  if (payload?.error) throw new Error(payload.error);
  if (!payload?.data?.user) throw new Error(`Stack Overflow user "${userId}" not found.`);
  return payload.data;
}
