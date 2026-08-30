CREATE TABLE "lock_reminders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"matchweek_id" uuid NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lock_reminders" ADD CONSTRAINT "lock_reminders_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lock_reminders" ADD CONSTRAINT "lock_reminders_matchweek_id_matchweeks_id_fk" FOREIGN KEY ("matchweek_id") REFERENCES "public"."matchweeks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "lock_reminders_user_matchweek_unique" ON "lock_reminders" USING btree ("user_id","matchweek_id");--> statement-breakpoint
CREATE INDEX "lock_reminders_matchweek_id_idx" ON "lock_reminders" USING btree ("matchweek_id");