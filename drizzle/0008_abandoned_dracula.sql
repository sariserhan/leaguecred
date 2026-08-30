CREATE TABLE "specialist_lock_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"follower_user_id" text NOT NULL,
	"specialist_user_id" text NOT NULL,
	"matchweek_id" uuid NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "specialist_lock_notifications" ADD CONSTRAINT "specialist_lock_notifications_follower_user_id_user_id_fk" FOREIGN KEY ("follower_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "specialist_lock_notifications" ADD CONSTRAINT "specialist_lock_notifications_specialist_user_id_user_id_fk" FOREIGN KEY ("specialist_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "specialist_lock_notifications" ADD CONSTRAINT "specialist_lock_notifications_matchweek_id_matchweeks_id_fk" FOREIGN KEY ("matchweek_id") REFERENCES "public"."matchweeks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "specialist_lock_notifications_unique" ON "specialist_lock_notifications" USING btree ("follower_user_id","specialist_user_id","matchweek_id");--> statement-breakpoint
CREATE INDEX "specialist_lock_notifications_matchweek_id_idx" ON "specialist_lock_notifications" USING btree ("matchweek_id");