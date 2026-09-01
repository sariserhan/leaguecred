CREATE TABLE "pick_votes" (
	"pick_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"value" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pick_votes_pick_id_user_id_pk" PRIMARY KEY("pick_id","user_id"),
	CONSTRAINT "pick_votes_value_check" CHECK ("pick_votes"."value" in (-1, 1))
);
--> statement-breakpoint
ALTER TABLE "pick_votes" ADD CONSTRAINT "pick_votes_pick_id_picks_id_fk" FOREIGN KEY ("pick_id") REFERENCES "public"."picks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pick_votes" ADD CONSTRAINT "pick_votes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pick_votes_user_id_idx" ON "pick_votes" USING btree ("user_id");