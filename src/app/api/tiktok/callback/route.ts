import { NextRequest, NextResponse } from "next/server";

export function GET(request: NextRequest) {
  const error = request.nextUrl.searchParams.get("error");
  const code = request.nextUrl.searchParams.get("code");

  if (error) {
    return NextResponse.json({ ok: false, error: "TikTok authorization was not completed." }, { status: 400 });
  }
  if (!code) {
    return NextResponse.json({ ok: false, error: "Missing TikTok authorization code." }, { status: 400 });
  }

  return NextResponse.json({ ok: true, message: "TikTok authorization callback received." });
}
