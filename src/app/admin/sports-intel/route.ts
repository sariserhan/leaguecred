import { requireAdmin } from "@/lib/admin";
import { readSportsIntelDashboard, snapshotResponse } from "@/services/sports-intel-dashboard";

// Authorization runs before anything is read, so a member never reaches the other database.
export async function GET() {
  await requireAdmin();

  return snapshotResponse(await readSportsIntelDashboard());
}
