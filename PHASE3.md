# APIVue — Phase 3: Integrations & Data Engine

Phase 3 is the provider/data-engine milestone: APIVue can connect verified accounts where the provider supports trustworthy authorization, while also tracking public developer profiles without claiming ownership.

## Provider coverage

- [x] GitHub — GitHub App OAuth with public/private repository access and server-side installation sync.
- [x] Codeforces — OpenID Connect OAuth and public profile/stat sync.
- [x] LeetCode — public username lookup; no ownership proof required.
- [x] Codewars — public username lookup; no GitHub account, clan edit, webhook, or profile modification required.
- [x] Stack Overflow — public numeric-user-id/profile-URL lookup; no OAuth or ownership verification required.

## Public-data engine

- [x] One normalized `PublicDataResult` contract for all five providers.
- [x] Provider-specific fetchers and normalizers.
- [x] Real public API data only; no synthetic profile metrics.
- [x] Profile, metrics, breakdowns, activity, repositories and source links where the provider exposes them.
- [x] Public profile URL input normalization for all five platforms where a canonical URL can identify the profile.
- [x] Short-lived lookup caching to reduce duplicate provider requests.
- [x] Retry handling for transient/rate-limit/server failures.
- [x] Friendly provider-specific errors and empty-data handling.
- [x] Saved-profile sync through the Supabase `sync-profile` Edge Function.
- [x] Snapshot creation for numeric sync metrics.

## Connection behavior

### Verified connections
GitHub and Codeforces use authorization.

### Public data connections
LeetCode, Codewars and Stack Overflow accept public identifiers and show a confirmation before APIVue tracks the public profile. Ownership is deliberately not claimed.

Stack Overflow uses the public Stack Exchange API. The official API exposes user lookups by numeric ID and public user statistics/tags, so APIVue does not need an OAuth token for this integration. citeturn0search0turn0search3turn0search11

## Explore

The Explore workspace supports all five platforms through the same public-data service while adapting its content to the data actually returned by each provider. Users can move the fetched result into Analytics or Compare without fetching a different profile.

## Reliability/security

- Supabase Edge Functions require authenticated callers for saved-profile sync and OAuth initiation steps where applicable.
- User-owned tracked profile rows are protected by user-scoped RLS.
- Public lookup caching is ephemeral browser state, not an ownership mechanism.
- Provider failures are surfaced instead of being converted into fabricated values.
- Stack Overflow OAuth is no longer part of the product flow, so the client-secret/PKCE failure cannot block public Stack Overflow lookup.

## Completion boundary

Phase 3's Stack Overflow integration is now fully public-data based. The old OAuth flow remains as unused server-side code for compatibility, but the product does not invoke it.
