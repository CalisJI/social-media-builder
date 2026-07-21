import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { oauthConfig, STATE_COOKIE } from "@/lib/tiktok";

export function GET() {
  const { clientKey, redirectUri } = oauthConfig();
  const state = crypto.randomBytes(24).toString("base64url");
  const params = new URLSearchParams({
    client_key: clientKey,
    response_type: "code",
    scope: [
      "user.info.basic",
      "user.info.profile",
      "user.info.stats",
      "video.list",
      "video.upload",
      "video.publish",
    ].join(","),
    redirect_uri: redirectUri,
    state,
  });
  const response = NextResponse.redirect(
    `https://www.tiktok.com/v2/auth/authorize/?${params}`,
  );
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}

