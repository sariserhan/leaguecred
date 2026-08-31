-- Creating a member and recording a lock against a played match are the two
-- most consequential things an admin can do to the record, so they get their
-- own audit actions rather than going unlogged.
ALTER TYPE "public"."admin_audit_action" ADD VALUE IF NOT EXISTS 'member_created';--> statement-breakpoint
ALTER TYPE "public"."admin_audit_action" ADD VALUE IF NOT EXISTS 'lock_assigned';
