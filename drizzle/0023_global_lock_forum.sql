CREATE TABLE "pick_opinions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "pick_id" uuid NOT NULL,
  "user_id" text NOT NULL,
  "parent_id" uuid,
  "body" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "pick_opinions_body_length_check" CHECK (char_length("body") between 2 and 500)
);

CREATE TABLE "pick_opinion_votes" (
  "opinion_id" uuid NOT NULL,
  "user_id" text NOT NULL,
  "value" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "pick_opinion_votes_opinion_id_user_id_pk" PRIMARY KEY("opinion_id", "user_id"),
  CONSTRAINT "pick_opinion_votes_value_check" CHECK ("value" in (-1, 1))
);

ALTER TABLE "pick_opinions" ADD CONSTRAINT "pick_opinions_pick_id_picks_id_fk" FOREIGN KEY ("pick_id") REFERENCES "public"."picks"("id") ON DELETE cascade;
ALTER TABLE "pick_opinions" ADD CONSTRAINT "pick_opinions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade;
ALTER TABLE "pick_opinions" ADD CONSTRAINT "pick_opinions_parent_id_pick_opinions_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pick_opinions"("id") ON DELETE cascade;
ALTER TABLE "pick_opinion_votes" ADD CONSTRAINT "pick_opinion_votes_opinion_id_pick_opinions_id_fk" FOREIGN KEY ("opinion_id") REFERENCES "public"."pick_opinions"("id") ON DELETE cascade;
ALTER TABLE "pick_opinion_votes" ADD CONSTRAINT "pick_opinion_votes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade;

CREATE INDEX "pick_opinions_pick_created_idx" ON "pick_opinions" USING btree ("pick_id", "created_at");
CREATE INDEX "pick_opinions_parent_id_idx" ON "pick_opinions" USING btree ("parent_id");
CREATE INDEX "pick_opinions_user_id_idx" ON "pick_opinions" USING btree ("user_id");
CREATE INDEX "pick_opinion_votes_user_id_idx" ON "pick_opinion_votes" USING btree ("user_id");
