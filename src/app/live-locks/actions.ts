"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { sqlClient } from "@/db";
import { getSession } from "@/lib/auth-session";
import { featureEnabled } from "@/lib/feature-gate";
import { LIVE_LOCKS_FLAG } from "@/lib/site-settings";
import { withinUserRateLimit } from "@/services/rate-limit";

export type ForumResult = { ok: true; score?: number; viewerVote?: number } | { ok: false; message: string };
export async function addLockOpinion(pickId: string, body: string, parentId?: string | null): Promise<ForumResult> {
  const parsed=z.object({pickId:z.string().uuid(),body:z.string().trim().min(2).max(500),parentId:z.string().uuid().nullable().optional()}).safeParse({pickId,body,parentId});
  if(!parsed.success)return{ok:false,message:"Write an opinion between 2 and 500 characters."};
  // A public endpoint outlives the page that calls it, so both writes check the
  // flag themselves rather than relying on the board being unreachable.
  if(!await featureEnabled(LIVE_LOCKS_FLAG))return{ok:false,message:"The global board is currently unavailable."};
  const session=await getSession();if(!session)return{ok:false,message:"Sign in to join the discussion."};
  if(!await withinUserRateLimit("addPickOpinion",session.user.id))return{ok:false,message:"You are posting too quickly. Wait a moment."};
  const [pick]=await sqlClient<Array<{id:string}>>`select p.id from picks p join fixtures f on f.id=p.fixture_id where p.id=${parsed.data.pickId} and p.result='pending' and f.status in ('scheduled','live') limit 1`;
  if(!pick)return{ok:false,message:"This lock is no longer active."};
  let rootParentId:string|null=null;if(parsed.data.parentId){const[parent]=await sqlClient<Array<{id:string}>>`select coalesce(parent_id,id) id from pick_opinions where id=${parsed.data.parentId} and pick_id=${pick.id}`;if(!parent)return{ok:false,message:"That reply target is no longer available."};rootParentId=parent.id;}
  await sqlClient`insert into pick_opinions(pick_id,user_id,parent_id,body) values(${pick.id},${session.user.id},${rootParentId},${parsed.data.body})`;
  revalidatePath("/live-locks");return{ok:true};
}
export async function voteLockOpinion(opinionId:string,value:-1|1):Promise<ForumResult>{
  const parsed=z.object({opinionId:z.string().uuid(),value:z.union([z.literal(-1),z.literal(1)])}).safeParse({opinionId,value});if(!parsed.success)return{ok:false,message:"That vote is invalid."};
  if(!await featureEnabled(LIVE_LOCKS_FLAG))return{ok:false,message:"The global board is currently unavailable."};
  const session=await getSession();if(!session)return{ok:false,message:"Sign in to vote."};if(!await withinUserRateLimit("votePickOpinion",session.user.id))return{ok:false,message:"You are voting too quickly."};
  const result=await sqlClient.begin(async(sql)=>{const[current]=await sql<Array<{value:number}>>`select value from pick_opinion_votes where opinion_id=${parsed.data.opinionId} and user_id=${session.user.id} for update`;
    if(current?.value===parsed.data.value)await sql`delete from pick_opinion_votes where opinion_id=${parsed.data.opinionId} and user_id=${session.user.id}`;else await sql`insert into pick_opinion_votes(opinion_id,user_id,value) values(${parsed.data.opinionId},${session.user.id},${parsed.data.value}) on conflict(opinion_id,user_id) do update set value=excluded.value,updated_at=now()`;
    const[score]=await sql<Array<{score:number;viewer_vote:number}>>`select coalesce(sum(value),0)::int score,coalesce(max(value) filter(where user_id=${session.user.id}),0)::int viewer_vote from pick_opinion_votes where opinion_id=${parsed.data.opinionId}`;return score;});
  revalidatePath("/live-locks");return{ok:true,score:result.score,viewerVote:result.viewer_vote};
}
