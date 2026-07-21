import { NextResponse } from "next/server";
import { publicOrigin, SESSION_COOKIE } from "@/lib/tiktok";

export async function POST() {
  const response = NextResponse.redirect(new URL("/", publicOrigin()), 303);
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
