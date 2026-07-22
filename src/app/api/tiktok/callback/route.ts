import { NextRequest, NextResponse } from "next/server";
import {
  encryptSession,
  oauthConfig,
  publicOrigin,
  SESSION_COOKIE,
  sessionCookieMaxAge,
  STATE_COOKIE,
} from "@/lib/tiktok";
import { storeTikTokSession } from "@/lib/tiktok-session-store";

export async function GET(request: NextRequest) {
  const origin = publicOrigin();
  const error = request.nextUrl.searchParams.get("error");
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get(STATE_COOKIE)?.value;

  if (error) {
    const response = NextResponse.redirect(new URL(`/?error=${encodeURIComponent(error)}`, origin));
    response.cookies.delete(STATE_COOKIE);
    return response;
  }
  if (!code || !state || !expectedState || state !== expectedState) {
    const response = NextResponse.redirect(new URL("/?error=invalid_oauth_response", origin));
    response.cookies.delete(STATE_COOKIE);
    return response;
  }

  const { clientKey, clientSecret, redirectUri } = oauthConfig();
  let token: {
    access_token?: string;
    open_id?: string;
    expires_in?: number;
    refresh_token?: string;
    refresh_expires_in?: number;
    error?: string;
    error_description?: string;
  } = {};
  try {
    const tokenResponse = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
      cache: "no-store",
    });
    token = await tokenResponse.json();
    if (!tokenResponse.ok || !token.access_token || !token.open_id) {
      throw new Error("token_exchange_failed");
    }
  } catch {
    const response = NextResponse.redirect(new URL("/?error=token_exchange_failed", origin));
    response.cookies.delete(STATE_COOKIE);
    return response;
  }

  const now = Date.now();
  const session = {
    accessToken: token.access_token,
    openId: token.open_id,
    accessExpiresAt: now + (token.expires_in ?? 86400) * 1000,
    refreshToken: token.refresh_token,
    refreshExpiresAt: token.refresh_expires_in
      ? now + token.refresh_expires_in * 1000
      : undefined,
  };
  const response = NextResponse.redirect(new URL("/studio?connected=1", origin));
  try {
    await storeTikTokSession(session);
  } catch {
    const failed = NextResponse.redirect(new URL("/?error=session_store_failed", origin));
    failed.cookies.delete(STATE_COOKIE);
    return failed;
  }
  response.cookies.set(
    SESSION_COOKIE,
    encryptSession(session),
    { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: sessionCookieMaxAge(session) },
  );
  response.cookies.delete(STATE_COOKIE);
  return response;
}
