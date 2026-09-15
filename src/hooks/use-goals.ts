import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type GoalStatus='active'|'completed'|'paused'|'cancelled';
export type GoalMetadataValue=string|number|boolean|null|GoalMetadata|GoalMetadataValue[];
export interface GoalMetadata{[key:string]:GoalMetadataValue|undefined;}
export interface Goal{id:string;title:string;description:string|null;category:string|null;target_value:number|null;current_value:number;unit:string|null;start_date:string|null;target_date:string|null;status:GoalStatus;metadata:GoalMetadata|null;created_at:string;}
export interface CreateGoalInput{title:string;description?:string;category?:string;target_value?:number|null;current_value?:number;unit?:string;start_date?:string;target_date?:string;metadata?:GoalMetadata;}
export interface UpdateGoalInput{id:string;title?:string;description?:string|null;category?:string|null;target_value?:number|null;current_value?:number;unit?:string|null;start_date?:string|null;target_date?:string|null;status?:GoalStatus;metadata?:GoalMetadata|null;}
export const goalsKey=['goals'] as const;
export function useGoals(){return useQuery({queryKey:goalsKey,queryFn:async():Promise<Goal[]>=>{const{data,error}=await supabase.from('goals').select('*').order('status',{ascending:true}).order('target_date',{ascending:true,nullsFirst:false});if(error)throw new Error(error.message);return(data??[]) as Goal[];}});}
export function useCreateGoal(){const qc=useQueryClient();return useMutation({mutationFn:async(goal:CreateGoalInput)=>{const{data:userData,error:userError}=await supabase.auth.getUser();if(userError||!userData.user)throw new Error('You must be signed in to create a goal.');const{data,error}=await supabase.from('goals').insert({...goal,user_id:userData.user.id,current_value:goal.current_value??0,metadata:goal.metadata??{}}).select('*').single();if(error)throw new Error(error.message);return data as Goal;},onSuccess:()=>qc.invalidateQueries({queryKey:goalsKey})});}
export function useUpdateGoal(){const qc=useQueryClient();return useMutation({mutationFn:async({id,...updates}:UpdateGoalInput)=>{const{error}=await supabase.from('goals').update(updates).eq('id',id);if(error)throw new Error(error.message);},onSuccess:()=>qc.invalidateQueries({queryKey:goalsKey})});}
export function useDeleteGoal(){const qc=useQueryClient();return useMutation({mutationFn:async(id:string)=>{const{error}=await supabase.from('goals').delete().eq('id',id);if(error)throw new Error(error.message);},onSuccess:()=>qc.invalidateQueries({queryKey:goalsKey})});}
