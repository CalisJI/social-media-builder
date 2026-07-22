import { isAuthorizedServiceRequest } from "@/lib/internal-api";
import { loadFreshTikTokSession } from "@/lib/tiktok-session-store";
import { tiktokFetch } from "@/lib/tiktok";

type StatusResponse = {
  data: {
    status: string;
    fail_reason?: string;
    publicaly_available_post_id?: string[];
    uploaded_bytes?: number;
  };
};

export async function POST(request: Request) {
  try {
    if (!isAuthorizedServiceRequest(request)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const input = await request.json() as Record<string, unknown>;
    const publishId = typeof input.publishId === "string" ? input.publishId.trim() : "";
    if (!publishId || publishId.length > 200) {
      return Response.json({ error: "publishId is required" }, { status: 400 });
    }
    const session = await loadFreshTikTokSession();
    if (!session) {
      return Response.json({ error: "TikTok owner must connect through the backend UI" }, { status: 409 });
    }
    const result = await tiktokFetch<StatusResponse>(
      "/v2/post/publish/status/fetch/",
      session.accessToken,
      { method: "POST", body: JSON.stringify({ publish_id: publishId }) },
    );
    return Response.json({ ok: true, publishId, ...result.data });
  } catch (error) {
    console.error("Internal TikTok status request failed", {
      message: error instanceof Error ? error.message : "unknown error",
    });
    return Response.json(
      { error: error instanceof Error ? error.message : "Status request failed" },
      { status: 502 },
    );
  }
}
