import { NextRequest, NextResponse } from "next/server";
import { decryptSession, SESSION_COOKIE } from "@/lib/tiktok";

const actions = new Set(["validate", "preview", "activate", "list"]);

async function proxy(request: NextRequest, action: string) {
  if (!actions.has(action)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!decryptSession(request.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.json({ error: "Connect TikTok first to manage templates." }, { status: 401 });
  const token = process.env.RENDER_TEMPLATE_ADMIN_TOKEN;
  const base = process.env.RENDERER_BASE_URL;
  if (!token || !base) return NextResponse.json({ error: "Template administration is not configured." }, { status: 503 });
  const method = action === "list" ? "GET" : "POST";
  const response = await fetch(`${base.replace(/\/$/, "")}/v1/templates${action === "list" ? "" : `/${action}`}`, {
    method, headers: { "x-template-admin-token": token, ...(method === "POST" ? { "content-type": "application/json" } : {}) },
    ...(method === "POST" ? { body: JSON.stringify(await request.json()) } : {}), cache: "no-store",
  });
  return NextResponse.json(await response.json(), { status: response.status });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ action: string }> }) { return proxy(request, (await params).action); }
export async function POST(request: NextRequest, { params }: { params: Promise<{ action: string }> }) { return proxy(request, (await params).action); }
