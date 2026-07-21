import { NextRequest, NextResponse } from "next/server";
import {
  encryptSession,
  oauthConfig,
  publicOrigin,
  SESSION_COOKIE,
  STATE_COOKIE,
} from "@/lib/tiktok";

export async function GET(request: NextRequest) {
  const origin = publicOrigin();
  const error = request.nextUrl.searchParams.get("error");
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get(STATE_COOKIE)?.value;

  if (error) {
    return NextResponse.redirect(new URL(`/?error=${encodeURIComponent(error)}`, origin));
  }
  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(new URL("/?error=invalid_oauth_response", origin));
  }

  const { clientKey, clientSecret, redirectUri } = oauthConfig();
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
  const token = (await tokenResponse.json()) as {
    access_token?: string;
    open_id?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!tokenResponse.ok || !token.access_token || !token.open_id) {
    const message = token.error_description || token.error || "token_exchange_failed";
    return NextResponse.redirect(new URL(`/?error=${encodeURIComponent(message)}`, origin));
  }

  const response = NextResponse.redirect(new URL("/studio?connected=1", origin));
  response.cookies.set(
    SESSION_COOKIE,
    encryptSession({
      accessToken: token.access_token,
      openId: token.open_id,
      expiresAt: Date.now() + (token.expires_in ?? 86400) * 1000,
    }),
    { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: token.expires_in ?? 86400 },
  );
  response.cookies.delete(STATE_COOKIE);
  return response;
}
