import { isAuthorizedServiceRequest } from "@/lib/internal-api";
import { getTikTokCreatorProfile } from "@/lib/tiktok";
import { loadFreshTikTokSession } from "@/lib/tiktok-session-store";

export async function GET(request: Request) {
  try {
    if (!isAuthorizedServiceRequest(request)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const session = await loadFreshTikTokSession();
    if (!session) {
      return Response.json(
        { error: "TikTok owner must connect through the backend UI" },
        { status: 409 },
      );
    }

    const profile = await getTikTokCreatorProfile(session);
    return Response.json({
      ok: true,
      channelHandle: profile.channelHandle,
      displayName: profile.displayName,
      handleAvailable: profile.channelHandle !== null,
      fetchedAt: new Date(profile.fetchedAt).toISOString(),
    });
  } catch (error) {
    console.error("Internal TikTok creator request failed", {
      message: error instanceof Error ? error.message : "unknown error",
    });
    return Response.json(
      { error: error instanceof Error ? error.message : "Creator info request failed" },
      { status: 502 },
    );
  }
}
