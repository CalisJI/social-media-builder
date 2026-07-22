import { NextResponse } from "next/server";
import { publicOrigin, SESSION_COOKIE } from "@/lib/tiktok";
import { clearStoredTikTokSession } from "@/lib/tiktok-session-store";

export async function POST() {
  await clearStoredTikTokSession();
  const response = NextResponse.redirect(new URL("/", publicOrigin()), 303);
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
