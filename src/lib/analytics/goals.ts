import type { Goal } from '@/hooks/use-goals';
import type { TrackedProfile, ProfileSnapshot } from '@/lib/integrations/registry';
import { buildProgressReport, type ProgressReport } from './progress';
import { resolveGoalValue } from './goal-tracking';

export interface GoalProgress {
  goal: Goal;
  currentValue: number;
  targetValue: number | null;
  progressPercentage: number;
  unit?: string;
  status: 'on-track' | 'behind' | 'completed' | 'paused' | 'cancelled';
  daysRemaining?: number;
  trend: 'positive' | 'negative' | 'neutral' | 'insufficient-data';
  relatedMetrics: Array<{ label: string; value: number | string; change?: number }>;
  recommendations: string[];
}
export interface GoalsSummary { total:number; completed:number; onTrack:number; behind:number; paused:number; cancelled:number; averageProgress:number; }
export interface GoalAction { id:string; type:'celebrate'|'encourage'|'warn'|'suggest'; title:string; description:string; priority:1|2|3; goalId?:string; }
export interface GoalSuggestion { title:string; description:string; target_value:number; unit:string; category:string; reasoning:string; }
const MS_PER_DAY=86_400_000;

function resolveStatus(goal:Goal,currentValue:number,targetValue:number|null,progressPercentage:number,daysRemaining:number|undefined,report:ProgressReport):GoalProgress['status']{
  if(goal.status==='paused') return 'paused';
  if(goal.status==='cancelled') return 'cancelled';
  if(goal.status==='completed') return 'completed';
  if(targetValue!==null&&currentValue>=targetValue) return 'completed';
  if(targetValue===null||daysRemaining===undefined) return 'on-track';
  if(daysRemaining<=0) return 'behind';
  if(progressPercentage>=80) return 'on-track';
  if(progressPercentage>=50) return report.activity.currentStreak>0?'on-track':'behind';
  if(progressPercentage<20&&daysRemaining<7) return 'behind';
  return 'on-track';
}
function resolveTrend(report:ProgressReport):GoalProgress['trend']{
  if(report.snapshotCount>=2&&report.trends.length){const positive=report.trends.filter(t=>t.change>0).length;const negative=report.trends.filter(t=>t.change<0).length;if(positive>negative)return'positive';if(negative>positive)return'negative';return'neutral';}
  return report.activity.totalEvents>0?'neutral':'insufficient-data';
}
function buildRecommendations(goal:Goal,status:GoalProgress['status'],trend:GoalProgress['trend'],currentValue:number,targetValue:number|null,daysRemaining:number|undefined):string[]{const out:string[]=[];if(status==='behind'||trend==='negative'){if(daysRemaining!==undefined&&daysRemaining>0&&targetValue!==null){const dailyNeeded=Math.ceil((targetValue-currentValue)/daysRemaining);if(dailyNeeded>0)out.push(`Increase daily ${goal.unit??'activity'} by ${dailyNeeded} to stay on track`);}out.push('Review your recent activity patterns');out.push('Consider setting smaller milestones');return out;}if(status==='on-track'&&trend==='positive'){out.push('Continue at your current pace');if(daysRemaining!==undefined&&daysRemaining>0)out.push(`You're on track to complete this goal in ${daysRemaining} days`);return out;}if(status==='completed'){out.push('Great job! Consider setting a new, more challenging goal');out.push('Share your achievement');}return out;}

export function calculateGoalProgress(goal:Goal,profiles:TrackedProfile[],snapshots:ProfileSnapshot[]):GoalProgress{
  const report=buildProgressReport(profiles,snapshots);
  const targetDate=goal.target_date?Date.parse(goal.target_date):null;
  const daysRemaining=targetDate!==null?Math.ceil((targetDate-Date.now())/MS_PER_DAY):undefined;
  const currentValue=resolveGoalValue(goal,profiles,snapshots);
  const targetValue=goal.target_value??null;
  const progressPercentage=targetValue!==null&&targetValue>0?Math.min(100,Math.round((currentValue/targetValue)*100)):0;
  const status=resolveStatus(goal,currentValue,targetValue,progressPercentage,daysRemaining,report);
  const trend=resolveTrend(report);
  return {goal,currentValue,targetValue,progressPercentage,unit:goal.unit??undefined,status,daysRemaining,trend,relatedMetrics:report.trends.slice(0,3).map(t=>({label:t.label,value:t.latest.value,change:t.change})),recommendations:buildRecommendations(goal,status,trend,currentValue,targetValue,daysRemaining)};
}
export function calculateAllGoalsProgress(goals:Goal[],profiles:TrackedProfile[],snapshots:ProfileSnapshot[]):GoalProgress[]{return goals.map(goal=>calculateGoalProgress(goal,profiles,snapshots));}
export function getGoalsSummary(progress:GoalProgress[]):GoalsSummary{const total=progress.length;return{total,completed:progress.filter(g=>g.status==='completed').length,onTrack:progress.filter(g=>g.status==='on-track').length,behind:progress.filter(g=>g.status==='behind').length,paused:progress.filter(g=>g.status==='paused').length,cancelled:progress.filter(g=>g.status==='cancelled').length,averageProgress:total?Math.round(progress.reduce((sum,g)=>sum+g.progressPercentage,0)/total):0};}
export function generateGoalActions(progress:GoalProgress[]):GoalAction[]{const actions:GoalAction[]=[];progress.filter(g=>g.status==='completed').forEach(g=>actions.push({id:`celebrate-${g.goal.id}`,type:'celebrate',title:`Goal completed: ${g.goal.title}`,description:`You've reached ${g.currentValue}${g.unit?` ${g.unit}`:''}!`,priority:1,goalId:g.goal.id}));progress.filter(g=>g.status==='behind'&&g.daysRemaining!==undefined&&g.daysRemaining<7).forEach(g=>actions.push({id:`warn-${g.goal.id}`,type:'warn',title:`${g.goal.title} at risk`,description:`You have ${g.daysRemaining} day${g.daysRemaining===1?'':'s'} left and are behind schedule.`,priority:1,goalId:g.goal.id}));progress.filter(g=>g.status==='on-track'&&g.progressPercentage>=50&&g.progressPercentage<80).forEach(g=>actions.push({id:`encourage-${g.goal.id}`,type:'encourage',title:`Keep going with ${g.goal.title}`,description:g.daysRemaining!==undefined?`You're ${g.progressPercentage}% of the way there with ${g.daysRemaining} day${g.daysRemaining===1?'':'s'} remaining.`:`You're making great progress!`,priority:2,goalId:g.goal.id}));progress.filter(g=>g.trend==='negative'||(g.status==='behind'&&g.daysRemaining!==undefined&&g.daysRemaining>=7)).forEach(g=>actions.push({id:`suggest-${g.goal.id}`,type:'suggest',title:`Improve ${g.goal.title} progress`,description:g.recommendations[0]??'Review your activity for this goal',priority:2,goalId:g.goal.id}));const typeOrder:Record<GoalAction['type'],number>={celebrate:0,warn:1,encourage:2,suggest:3};return actions.sort((a,b)=>a.priority-b.priority||typeOrder[a.type]-typeOrder[b.type]);}
export function suggestNewGoals(profiles:TrackedProfile[],snapshots:ProfileSnapshot[],existingGoals:Goal[]):GoalSuggestion[]{const report=buildProgressReport(profiles,snapshots);if(report.snapshotCount===0)return[];const suggestions:GoalSuggestion[]=[];const existingTitles=new Set(existingGoals.map(g=>g.title.toLowerCase()));const isDuplicate=(title:string)=>existingTitles.has(title.toLowerCase());report.categoryProgress.forEach(category=>{const startingValue=category.trends.reduce((sum,t)=>sum+t.latest.value,0);if(startingValue<=0)return;const title=`Increase ${category.label} metrics`;if(isDuplicate(title))return;const target=Math.round(startingValue*1.15);suggestions.push({title,description:`Improve your combined metrics in ${category.label}`,target_value:target,unit:'points',category:category.category,reasoning:`Current combined value is ${startingValue}; aiming for ${target} (15% increase).`});});if(report.activity.longestStreak>0){const title='Beat your longest streak';if(!isDuplicate(title)){const nextStreak=report.activity.longestStreak+3;suggestions.push({title,description:`Maintain daily activity for ${nextStreak} consecutive days`,target_value:nextStreak,unit:'days',category:'activity',reasoning:`Your current longest streak is ${report.activity.longestStreak} day${report.activity.longestStreak===1?'':'s'}.`});}}if(report.activity.activeDays>0&&report.activity.activeDays<30){const title='Increase active days';if(!isDuplicate(title)){const target=Math.min(30,report.activity.activeDays+5);suggestions.push({title,description:`Aim for ${target} active days in the next tracking period`,target_value:target,unit:'days',category:'activity',reasoning:`You've had ${report.activity.activeDays} active day${report.activity.activeDays===1?'':'s'} so far.`});}}return suggestions;}
