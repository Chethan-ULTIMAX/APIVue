/** Shared integration types. */
import type { LucideIcon } from 'lucide-react';
import type { GitHubContributionAnalytics } from '@/lib/public-data/types';
export type IntegrationId = 'github' | 'codeforces' | 'leetcode' | 'codewars' | 'stackoverflow' | 'tryhackme' | 'hackthebox';
export type CategoryId = 'development' | 'competitive-programming' | 'security' | 'learning' | 'activity' | 'goals';
export interface ConnectedAccount { connected: boolean; username?: string; handle?: string; displayName?: string | null; avatarUrl?: string | null; profileUrl?: string; connectedAt?: string; lastSyncedAt?: string; error?: string; privateAccess?: boolean; accessibleRepoCount?: number; ownershipVerified?: boolean; verificationMethod?: string; }
export type IntegrationStatus = Record<IntegrationId, ConnectedAccount>;
export interface CategoryDefinition { id: CategoryId; label: string; description: string; }
export interface MetricDefinition { key: string; label: string; unit?: string; }
export interface IntegrationDefinition { id: IntegrationId; name: string; description: string; category: string; categories: CategoryId[]; available: boolean; authType: 'oauth' | 'username' | 'coming-soon'; icon: LucideIcon; accent: string; handleLabel: string; handlePlaceholder: string; handleHint: string; headlineMetrics: string[]; metrics?: MetricDefinition[]; dataClass?: 'verified' | 'public'; }
export interface Metric { key: string; label: string; value: string | number; change?: number; unit?: string; format?: string; }
export interface RatingHistoryPoint { date: string; value: number; label?: string; }
export interface ProfileHighlight { title: string; url?: string; subtitle?: string; value?: string; }
export interface ProfileBreakdown { key: string; label: string; unit?: string; items: Array<{ label: string; value: number }>; }
export interface GitHubRepository { id?: number; name: string; url: string; html_url?: string; private?: boolean; description?: string | null; language?: string | null; stars?: number; forks?: number; stargazers_count?: number; forks_count?: number; open_issues_count?: number; updatedAt?: string | null; updated_at?: string | null; }
export interface ProfileData {
  bio?: string; location?: string; joinedAt?: string;
  metrics?: Metric[]; activity?: Array<{ date: string; count: number; label?: string; type?: string }>;
  ratingHistory?: RatingHistoryPoint[]; highlights?: ProfileHighlight[]; breakdowns?: ProfileBreakdown[];
  githubContributions?: GitHubContributionAnalytics;
  privateAccess?: boolean; accessibleRepoCount?: number; privateRepoCount?: number;
  repositories?: GitHubRepository[]; publicRepositories?: GitHubRepository[]; privateRepositories?: GitHubRepository[];
  ownershipVerified?: boolean; verificationMethod?: string; verificationVerifiedAt?: string;
  dataSource?: 'public-api' | 'public-profile' | 'oauth' | 'platform-verified';
  dataNotice?: string;
}
export interface TrackedProfile { id: string; platform: IntegrationId | string; username?: string; handle: string; displayName?: string; display_name?: string; avatarUrl?: string | null; avatar_url?: string | null; profileUrl?: string; profile_url?: string; pinned?: boolean; lastSyncedAt?: string; last_synced_at?: string; syncError?: string; sync_error?: string; data?: ProfileData; }
export type NormalizedProfile = TrackedProfile;
export interface ProfileSnapshot { id: string; profile_id: string; captured_at: string; metrics: Record<string, number>; }
