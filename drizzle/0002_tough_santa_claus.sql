CREATE TABLE "active_settlement_effects" (
	"pick_id" uuid PRIMARY KEY NOT NULL,
	"event_id" uuid NOT NULL,
	"result" "pick_result" NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "active_settlement_effects_event_id_unique" UNIQUE("event_id"),
	CONSTRAINT "active_settlement_effects_not_pending_check" CHECK ("active_settlement_effects"."result" <> 'pending')
);
--> statement-breakpoint
DROP INDEX "settlement_events_one_active_per_pick_unique";--> statement-breakpoint
ALTER TABLE "active_settlement_effects" ADD CONSTRAINT "active_settlement_effects_pick_id_picks_id_fk" FOREIGN KEY ("pick_id") REFERENCES "public"."picks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "active_settlement_effects" ADD CONSTRAINT "active_settlement_effects_event_id_settlement_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."settlement_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_events" DROP COLUMN "is_active";