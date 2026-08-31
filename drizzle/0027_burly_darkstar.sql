CREATE TYPE "public"."site_feedback_kind" AS ENUM('bug', 'contact', 'support');--> statement-breakpoint
CREATE TABLE "site_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "site_feedback_kind" NOT NULL,
	"user_id" text,
	"email" text,
	"message" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "site_feedback" ADD CONSTRAINT "site_feedback_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "site_feedback_kind_created_idx" ON "site_feedback" USING btree ("kind","created_at");
