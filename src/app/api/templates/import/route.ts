import { NextRequest, NextResponse } from "next/server";
import { decryptSession, SESSION_COOKIE } from "@/lib/tiktok";

export async function POST(request: NextRequest) {
  if (!decryptSession(request.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.json({ error: "Connect TikTok first to import a template." }, { status: 401 });
  const token = process.env.RENDER_TEMPLATE_ADMIN_TOKEN;
  const base = process.env.RENDERER_BASE_URL;
  if (!token || !base) return NextResponse.json({ error: "Template importer is not configured." }, { status: 503 });
  try {
    const response = await fetch(`${base.replace(/\/$/, "")}/v1/templates/import`, { method: "POST", headers: { "content-type": "application/json", "x-template-admin-token": token }, body: JSON.stringify(await request.json()), cache: "no-store" });
    const payload = await response.json().catch(() => ({ error: "Renderer returned an invalid response." }));
    return NextResponse.json(payload, { status: response.status });
  } catch { return NextResponse.json({ error: "Template renderer is unavailable." }, { status: 502 }); }
}
