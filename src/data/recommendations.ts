import "server-only";
import { cache } from "react";
import { sqlClient } from "@/db";
import { MINIMUM_SETTLED_PICKS_FOR_RANK } from "@/lib/reputation";
export type SpecialistRecommendation={leagueId:string;leagueName:string;leagueSlug:string;specialistId:string;specialistName:string;initials:string;wins:number;losses:number;settledPicks:number;streak:number;adjusted:number;followers:number;followed:boolean;rank:number};
export const getPersonalizedRecommendations=cache(async(userId:string)=>sqlClient<Array<{league_id:string;league_name:string;league_slug:string;specialist_id:string;specialist_name:string;wins:number;losses:number;settled_picks:number;current_win_streak:number;adjusted:string;followers:number;followed:boolean;rank:number}>>`
  with ranked as (
    select p.league_id,l.name league_name,l.slug league_slug,u.id specialist_id,u.name specialist_name,
      r.wins,r.losses,r.settled_picks,r.current_win_streak,r.confidence_adjusted_accuracy::text adjusted,
      (select count(*)::int from league_follows f where f.specialist_user_id=u.id and f.league_id=l.id) followers,
      exists(select 1 from league_follows f where f.follower_user_id=${userId} and f.specialist_user_id=u.id and f.league_id=l.id) followed,
      row_number() over(partition by p.league_id order by r.confidence_adjusted_accuracy desc nulls last,r.settled_picks desc,r.last_settled_at asc) rank
    from user_league_preferences p join leagues l on l.id=p.league_id join user_league_records r on r.league_id=p.league_id join "user" u on u.id=r.user_id
    where p.user_id=${userId} and p.kind='help' and r.user_id<>${userId} and r.settled_picks>=${MINIMUM_SETTLED_PICKS_FOR_RANK}
  ) select * from ranked where rank<=3 order by league_name,rank`.then(rows=>rows.map(x=>({leagueId:x.league_id,leagueName:x.league_name,leagueSlug:x.league_slug,specialistId:x.specialist_id,specialistName:x.specialist_name,initials:x.specialist_name.split(/\s+/).map(y=>y[0]).join("").slice(0,2).toUpperCase(),wins:x.wins,losses:x.losses,settledPicks:x.settled_picks,streak:x.current_win_streak,adjusted:Number(x.adjusted),followers:x.followers,followed:x.followed,rank:x.rank}))));
