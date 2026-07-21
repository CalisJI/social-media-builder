import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/tiktok";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/", request.url), 303);
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
