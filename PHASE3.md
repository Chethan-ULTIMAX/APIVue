# APIVue — Phase 3: Integrations & Data Engine

Phase 3 is the provider/data-engine milestone: APIVue can connect verified accounts where the provider supports trustworthy authorization, while also tracking public developer profiles without claiming ownership.

## Provider coverage

- [x] GitHub — GitHub App OAuth with public/private repository access and server-side installation sync.
- [x] Codeforces — OpenID Connect OAuth and public profile/stat sync.
- [x] LeetCode — public username lookup; no ownership proof required.
- [x] Codewars — public username lookup; no GitHub account, clan edit, webhook, or profile modification required.
- [x] Stack Overflow — OAuth/PKCE connection plus public numeric-user-id lookup.

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
GitHub, Codeforces and Stack Overflow use authorization. Their OAuth secrets stay server-side in Supabase Edge Functions.

### Public data connections
LeetCode and Codewars accept a public username and show a confirmation before APIVue tracks the public profile. Ownership is deliberately not claimed.

## Explore

The Explore workspace supports all five platforms through the same public-data service while adapting its content to the data actually returned by each provider. Users can move the fetched result into Analytics or Compare without fetching a different profile.

## Reliability/security

- Supabase Edge Functions require authenticated callers for saved-profile sync and OAuth initiation/completion steps where applicable.
- OAuth callbacks use custom state validation where provider callbacks cannot carry a Supabase JWT.
- User-owned tracked profile rows are protected by user-scoped RLS.
- Public lookup caching is ephemeral browser state, not an ownership mechanism.
- Provider failures are surfaced instead of being converted into fabricated values.

## Completion boundary

Phase 3 is complete at the application/code and deployed-integration layer. Provider dashboards can still require an individual user's authorization flow to be exercised once in production; APIVue does not fabricate that external consent step.
