import { NextRequest, NextResponse } from "next/server";
import {
  decryptSession,
  encryptSession,
  publicOrigin,
  refreshTikTokSession,
  SESSION_COOKIE,
  sessionCookieMaxAge,
} from "@/lib/tiktok";
import { storeTikTokSession } from "@/lib/tiktok-session-store";

export async function GET(request: NextRequest) {
  const origin = publicOrigin();
  const current = decryptSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!current) return NextResponse.redirect(new URL("/?error=session_required", origin));

  try {
    const session = await refreshTikTokSession(current);
    await storeTikTokSession(session);
    const response = NextResponse.redirect(new URL("/studio", origin));
    response.cookies.set(SESSION_COOKIE, encryptSession(session), {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: sessionCookieMaxAge(session),
    });
    return response;
  } catch {
    const response = NextResponse.redirect(new URL("/?error=session_expired", origin));
    response.cookies.delete(SESSION_COOKIE);
    return response;
  }
}
