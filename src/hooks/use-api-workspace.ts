/**
 * Supabase-backed persistence for the APIVue request workspace.
 *
 * Every query is additionally filtered by `user_id` even though RLS already
 * enforces ownership: defence in depth, and it keeps the intent explicit for
 * a reader who has not opened the migration.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import type {
  BodyMode,
  Environment,
  HttpMethod,
  KeyValueRow,
} from '@/lib/http/types';

export interface ApiCollectionRow {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface ApiRequestRow {
  id: string;
  name: string;
  collection_id: string | null;
  method: HttpMethod;
  url: string;
  params: KeyValueRow[];
  headers: KeyValueRow[];
  body_mode: BodyMode;
  body: string | null;
  auth: Record<string, unknown>;
  updated_at: string;
}

export interface ApiEnvironmentRow {
  id: string;
  name: string;
  variables: Environment['variables'];
  is_active: boolean;
}

export const collectionsKey = (userId?: string) => ['api-collections', userId ?? 'anon'] as const;
export const apiRequestsKey = (userId?: string) => ['api-requests', userId ?? 'anon'] as const;
export const environmentsKey = (userId?: string) => ['api-environments', userId ?? 'anon'] as const;

function asRows<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

/**
 * The generated types model jsonb columns as `Json`, which does not accept
 * interface types structurally. The migration constrains these columns to
 * jsonb arrays/objects, so this narrowing helper keeps the call sites typed
 * without leaking `any`.
 */
function toJson(value: unknown): never {
  return value as never;
}

export function useCollections() {
  const { user } = useAuth();
  return useQuery({
    queryKey: collectionsKey(user?.id),
    enabled: Boolean(user),
    queryFn: async (): Promise<ApiCollectionRow[]> => {
      const { data, error } = await supabase
        .from('api_collections')
        .select('id,name,description,created_at')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: true });
      if (error) throw new Error(error.message);
      return asRows<ApiCollectionRow>(data);
    },
  });
}

export function useApiRequests() {
  const { user } = useAuth();
  return useQuery({
    queryKey: apiRequestsKey(user?.id),
    enabled: Boolean(user),
    queryFn: async (): Promise<ApiRequestRow[]> => {
      const { data, error } = await supabase
        .from('api_saved_requests')
        .select('id,name,collection_id,method,url,params,headers,body_mode,body,auth,updated_at')
        .eq('user_id', user!.id)
        .order('updated_at', { ascending: false });
      if (error) throw new Error(error.message);
      return asRows<ApiRequestRow>(data).map((row) => ({
        ...row,
        params: asRows<KeyValueRow>(row.params),
        headers: asRows<KeyValueRow>(row.headers),
      }));
    },
  });
}

export function useEnvironments() {
  const { user } = useAuth();
  return useQuery({
    queryKey: environmentsKey(user?.id),
    enabled: Boolean(user),
    queryFn: async (): Promise<ApiEnvironmentRow[]> => {
      const { data, error } = await supabase
        .from('api_environments')
        .select('id,name,variables,is_active')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: true });
      if (error) throw new Error(error.message);
      return asRows<ApiEnvironmentRow>(data).map((row) => ({
        ...row,
        variables: asRows<Environment['variables'][number]>(row.variables),
      }));
    },
  });
}

function invalidateAll(queryClient: ReturnType<typeof useQueryClient>, userId?: string) {
  void queryClient.invalidateQueries({ queryKey: collectionsKey(userId) });
  void queryClient.invalidateQueries({ queryKey: apiRequestsKey(userId) });
}

export function useCreateCollection() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; description?: string }) => {
      if (!user) throw new Error('You must be signed in.');
      const { error } = await supabase.from('api_collections').insert({
        user_id: user.id,
        name: input.name.trim(),
        description: input.description?.trim() || null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => invalidateAll(queryClient, user?.id),
  });
}

export function useUpdateCollection() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; name: string }) => {
      if (!user) throw new Error('You must be signed in.');
      const { error } = await supabase
        .from('api_collections')
        .update({ name: input.name.trim(), updated_at: new Date().toISOString() })
        .eq('id', input.id)
        .eq('user_id', user.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => invalidateAll(queryClient, user?.id),
  });
}

export function useDeleteCollection() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('You must be signed in.');
      // Saved requests are detached (collection_id -> null), never deleted.
      const { error } = await supabase
        .from('api_collections')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => invalidateAll(queryClient, user?.id),
  });
}

export interface SaveRequestInput {
  id?: string;
  name: string;
  collectionId: string | null;
  method: HttpMethod;
  url: string;
  params: KeyValueRow[];
  headers: KeyValueRow[];
  bodyMode: BodyMode;
  body: string;
  auth: Record<string, unknown>;
}

export function useSaveRequest() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SaveRequestInput) => {
      if (!user) throw new Error('You must be signed in to save requests.');
      const payload = {
        user_id: user.id,
        name: input.name.trim(),
        collection_id: input.collectionId,
        method: input.method,
        url: input.url,
        params: toJson(input.params),
        headers: toJson(input.headers),
        body_mode: input.bodyMode,
        body: input.bodyMode === 'none' ? null : input.body,
        auth: toJson(input.auth),
        updated_at: new Date().toISOString(),
      };
      if (input.id) {
        const { error } = await supabase
          .from('api_saved_requests')
          .update(payload)
          .eq('id', input.id)
          .eq('user_id', user.id);
        if (error) throw new Error(error.message);
        return input.id;
      }
      const { data, error } = await supabase
        .from('api_saved_requests')
        .insert(payload)
        .select('id')
        .single();
      if (error) throw new Error(error.message);
      return (data as { id: string }).id;
    },
    onSuccess: () => invalidateAll(queryClient, user?.id),
  });
}

export function useDeleteRequest() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('You must be signed in.');
      const { error } = await supabase
        .from('api_saved_requests')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => invalidateAll(queryClient, user?.id),
  });
}

export function useSaveEnvironment() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id?: string; name: string; variables: Environment['variables'] }) => {
      if (!user) throw new Error('You must be signed in.');
      const payload = {
        user_id: user.id,
        name: input.name.trim(),
        variables: toJson(input.variables),
        updated_at: new Date().toISOString(),
      };
      if (input.id) {
        const { error } = await supabase
          .from('api_environments')
          .update(payload)
          .eq('id', input.id)
          .eq('user_id', user.id);
        if (error) throw new Error(error.message);
        return input.id;
      }
      const { data, error } = await supabase
        .from('api_environments')
        .insert(payload)
        .select('id')
        .single();
      if (error) throw new Error(error.message);
      return (data as { id: string }).id;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: environmentsKey(user?.id) }),
  });
}

export function useDeleteEnvironment() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('You must be signed in.');
      const { error } = await supabase
        .from('api_environments')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: environmentsKey(user?.id) }),
  });
}
