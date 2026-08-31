import { NextResponse } from "next/server";

import { getNotificationCenter } from "@/data/notifications";
import { getSession } from "@/lib/auth-session";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Your session has expired." }, { status: 401 });

  const center = await getNotificationCenter(session.user.id);
  return NextResponse.json({ items: center.items }, { headers: { "Cache-Control": "private, no-store" } });
}
