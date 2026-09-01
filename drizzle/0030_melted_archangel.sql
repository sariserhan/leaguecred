CREATE TABLE "slip_candidates" (
	"user_id" text NOT NULL,
	"fixture_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "slip_candidates_user_id_fixture_id_pk" PRIMARY KEY("user_id","fixture_id")
);
--> statement-breakpoint
ALTER TABLE "slip_candidates" ADD CONSTRAINT "slip_candidates_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slip_candidates" ADD CONSTRAINT "slip_candidates_fixture_id_fixtures_id_fk" FOREIGN KEY ("fixture_id") REFERENCES "public"."fixtures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "slip_candidates_fixture_id_idx" ON "slip_candidates" USING btree ("fixture_id");