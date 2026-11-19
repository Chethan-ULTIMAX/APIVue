-- ============================================================
-- APIVue API Workspace
--
-- Purely additive schema for the HTTP request builder:
--   * api_collections   - folders that group saved requests
--   * api_saved_requests - reusable request definitions
--   * api_environments  - named variable sets (dev/test/prod)
--
-- This migration does NOT alter, drop or rewrite any existing
-- table, row, policy or grant. It only creates new empty tables.
--
-- Request history is intentionally NOT stored server-side: it
-- lives in the browser so response metadata/status codes are
-- never persisted in the database.
--
-- Run with:  supabase db push
-- ============================================================

-- ------------------------------------------------------------
-- 1. COLLECTIONS
-- ------------------------------------------------------------
create table if not exists public.api_collections (
    id uuid primary key default gen_random_uuid(),

    user_id uuid not null
        references auth.users(id)
        on delete cascade,

    name text not null
        check (char_length(btrim(name)) between 1 and 120),

    description text,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now()
);

comment on table public.api_collections is
    'User-owned folders that group saved API requests.';

grant select, insert, update, delete on public.api_collections to authenticated;
grant all on public.api_collections to service_role;

alter table public.api_collections enable row level security;

drop policy if exists "Users can view own api collections" on public.api_collections;
create policy "Users can view own api collections"
on public.api_collections for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own api collections" on public.api_collections;
create policy "Users can insert own api collections"
on public.api_collections for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own api collections" on public.api_collections;
create policy "Users can update own api collections"
on public.api_collections for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own api collections" on public.api_collections;
create policy "Users can delete own api collections"
on public.api_collections for delete to authenticated
using ((select auth.uid()) = user_id);

create index if not exists idx_api_collections_user
    on public.api_collections(user_id, created_at);

-- ------------------------------------------------------------
-- 2. SAVED REQUESTS
--
-- Credentials are never stored implicitly: `auth` holds only what
-- the user explicitly saved for that request.
-- ------------------------------------------------------------
create table if not exists public.api_saved_requests (
    id uuid primary key default gen_random_uuid(),

    user_id uuid not null
        references auth.users(id)
        on delete cascade,

    collection_id uuid
        references public.api_collections(id)
        on delete set null,

    name text not null
        check (char_length(btrim(name)) between 1 and 160),

    method text not null default 'GET'
        check (method in ('GET','POST','PUT','PATCH','DELETE','HEAD','OPTIONS')),

    url text not null
        check (char_length(url) <= 8000),

    params jsonb not null default '[]'::jsonb,

    headers jsonb not null default '[]'::jsonb,

    body_mode text not null default 'none'
        check (body_mode in ('none','json','text','x-www-form-urlencoded')),

    body text,

    auth jsonb not null default '{"mode":"none"}'::jsonb,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now(),

    constraint api_saved_requests_params_is_array
        check (jsonb_typeof(params) = 'array'),

    constraint api_saved_requests_headers_is_array
        check (jsonb_typeof(headers) = 'array'),

    constraint api_saved_requests_auth_is_object
        check (jsonb_typeof(auth) = 'object')
);

comment on table public.api_saved_requests is
    'User-owned saved API request definitions.';

grant select, insert, update, delete on public.api_saved_requests to authenticated;
grant all on public.api_saved_requests to service_role;

alter table public.api_saved_requests enable row level security;

-- A request may only be filed under a collection owned by the same user.
create or replace function public.api_request_collection_is_owned(target_collection uuid, owner uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
    select target_collection is null
        or exists (
            select 1
            from public.api_collections c
            where c.id = target_collection
              and c.user_id = owner
        );
$$;

drop policy if exists "Users can view own api requests" on public.api_saved_requests;
create policy "Users can view own api requests"
on public.api_saved_requests for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own api requests" on public.api_saved_requests;
create policy "Users can insert own api requests"
on public.api_saved_requests for insert to authenticated
with check (
    (select auth.uid()) = user_id
    and public.api_request_collection_is_owned(collection_id, (select auth.uid()))
);

drop policy if exists "Users can update own api requests" on public.api_saved_requests;
create policy "Users can update own api requests"
on public.api_saved_requests for update to authenticated
using ((select auth.uid()) = user_id)
with check (
    (select auth.uid()) = user_id
    and public.api_request_collection_is_owned(collection_id, (select auth.uid()))
);

drop policy if exists "Users can delete own api requests" on public.api_saved_requests;
create policy "Users can delete own api requests"
on public.api_saved_requests for delete to authenticated
using ((select auth.uid()) = user_id);

create index if not exists idx_api_saved_requests_user
    on public.api_saved_requests(user_id, updated_at desc);

create index if not exists idx_api_saved_requests_collection
    on public.api_saved_requests(collection_id);

-- ------------------------------------------------------------
-- 3. ENVIRONMENTS
--
-- variables: [{"key":"base_url","value":"https://…","secret":false}]
-- Secret values are only ever read by the owner's browser.
-- ------------------------------------------------------------
create table if not exists public.api_environments (
    id uuid primary key default gen_random_uuid(),

    user_id uuid not null
        references auth.users(id)
        on delete cascade,

    name text not null
        check (char_length(btrim(name)) between 1 and 80),

    variables jsonb not null default '[]'::jsonb,

    is_active boolean not null default false,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now(),

    constraint api_environments_variables_is_array
        check (jsonb_typeof(variables) = 'array')
);

comment on table public.api_environments is
    'User-owned variable sets (base_url, api_version, tokens) for the request builder.';

grant select, insert, update, delete on public.api_environments to authenticated;
grant all on public.api_environments to service_role;

alter table public.api_environments enable row level security;

drop policy if exists "Users can view own api environments" on public.api_environments;
create policy "Users can view own api environments"
on public.api_environments for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own api environments" on public.api_environments;
create policy "Users can insert own api environments"
on public.api_environments for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own api environments" on public.api_environments;
create policy "Users can update own api environments"
on public.api_environments for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own api environments" on public.api_environments;
create policy "Users can delete own api environments"
on public.api_environments for delete to authenticated
using ((select auth.uid()) = user_id);

create index if not exists idx_api_environments_user
    on public.api_environments(user_id, created_at);
