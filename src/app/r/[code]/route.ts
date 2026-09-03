import { NextResponse } from "next/server";

import { safeReferralCode } from "@/lib/referral-code";

const REFERRAL_COOKIE = "leaguecred_referral";

export async function GET(request: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params;
  const safeCode = safeReferralCode(code);
  // The code travels on in the URL as well as in the cookie. The cookie is what
  // credits the referral; the parameter is what lets the page it lands on say
  // who sent them, and what a link preview reads when the invitation is pasted
  // into a group chat.
  const destination = new URL(safeCode ? `/auth?next=%2Fonboarding&from=${safeCode}` : "/auth?next=%2Fonboarding", request.url);
  const response = NextResponse.redirect(destination);
  if (safeCode) response.cookies.set(REFERRAL_COOKIE, safeCode, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 30, path: "/" });
  return response;
}
