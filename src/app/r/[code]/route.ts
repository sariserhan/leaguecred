import { NextResponse } from "next/server";

const REFERRAL_COOKIE = "leaguecred_referral";

export async function GET(request: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params;
  const safeCode = code.replace(/[^a-zA-Z0-9]/g, "").slice(0, 32);
  const response = NextResponse.redirect(new URL("/auth?next=%2Fonboarding", request.url));
  if (safeCode) response.cookies.set(REFERRAL_COOKIE, safeCode, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 30, path: "/" });
  return response;
}
