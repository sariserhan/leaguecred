-- Starting a Sports Intel collection run from the admin page spends that
-- project's odds credits, so each one is recorded against the admin who did it.
ALTER TYPE "public"."admin_audit_action" ADD VALUE IF NOT EXISTS 'sports_intel_run_started';
