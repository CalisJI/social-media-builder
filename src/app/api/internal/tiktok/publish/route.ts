import { isAuthorizedServiceRequest, validateMediaUrl, validateRemoteMedia } from "@/lib/internal-api";
import { loadFreshTikTokSession } from "@/lib/tiktok-session-store";
import { tiktokFetch } from "@/lib/tiktok";
import {
  IdempotencyError,
  findIdempotentPublish,
  runIdempotentPublish,
  validateIdempotencyKey,
} from "@/lib/publish-idempotency.mjs";

type InitResponse = { data: { publish_id: string } };
const privacyLevels = new Set([
  "PUBLIC_TO_EVERYONE",
  "MUTUAL_FOLLOW_FRIENDS",
  "FOLLOWER_OF_CREATOR",
  "SELF_ONLY",
]);

export async function POST(request: Request) {
  try {
    if (!isAuthorizedServiceRequest(request)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const input = await request.json() as Record<string, unknown>;
    const idempotencyKey = validateIdempotencyKey(input.idempotencyKey);
    const videoUrl = validateMediaUrl(input.videoUrl);
    const caption = typeof input.caption === "string" ? input.caption.trim() : "";
    const mode = input.mode === "publish" ? "publish" : "draft";
    const privacy = typeof input.privacy === "string" ? input.privacy : "SELF_ONLY";
    if (caption.length > 2200) {
      return Response.json({ error: "caption must not exceed 2200 characters" }, { status: 400 });
    }
    if (!privacyLevels.has(privacy)) {
      return Response.json({ error: "privacy is invalid" }, { status: 400 });
    }
    if (
      mode === "publish" &&
      process.env.TIKTOK_ALLOW_PUBLIC_POSTS !== "true" &&
      privacy !== "SELF_ONLY"
    ) {
      return Response.json(
        { error: "Direct Post is limited to SELF_ONLY until TikTok approval" },
        { status: 400 },
      );
    }

    const endpoint = mode === "publish"
      ? "/v2/post/publish/video/init/"
      : "/v2/post/publish/inbox/video/init/";
    const sourceInfo = { source: "PULL_FROM_URL", video_url: videoUrl };
    const body = mode === "publish"
      ? {
          post_info: {
            title: caption,
            privacy_level: privacy,
            disable_duet: false,
            disable_comment: false,
            disable_stitch: false,
            video_cover_timestamp_ms: 1000,
          },
          source_info: sourceInfo,
        }
      : { source_info: sourceInfo };
    const idempotencyFile = process.env.PUBLISH_IDEMPOTENCY_FILE;
    if (!idempotencyFile) {
      return Response.json({ error: "PUBLISH_IDEMPOTENCY_FILE is not configured" }, { status: 503 });
    }
    const idempotencyRequest = { videoUrl, caption, mode, privacy };
    const replay = await findIdempotentPublish({
      file: idempotencyFile,
      key: idempotencyKey,
      request: idempotencyRequest,
    });
    if (replay) {
      return Response.json({ ...replay.result, cached: replay.cached, shared: replay.shared === true });
    }

    await validateRemoteMedia(videoUrl);
    const session = await loadFreshTikTokSession();
    if (!session) {
      return Response.json({ error: "TikTok owner must connect through the backend UI" }, { status: 409 });
    }
    const outcome = await runIdempotentPublish({
      file: idempotencyFile,
      key: idempotencyKey,
      request: idempotencyRequest,
      operation: async () => {
        const initialized = await tiktokFetch<InitResponse>(endpoint, session.accessToken, {
          method: "POST",
          body: JSON.stringify(body),
        });
        return { ok: true, publishId: initialized.data.publish_id, mode };
      },
    });
    console.info("Internal TikTok publish idempotency outcome", {
      idempotencyKey,
      state: outcome.state,
      cached: outcome.cached,
      shared: outcome.shared === true,
    });
    return Response.json({ ...outcome.result, cached: outcome.cached, shared: outcome.shared === true });
  } catch (error) {
    console.error("Internal TikTok publish request failed", {
      message: error instanceof Error ? error.message : "unknown error",
    });
    const message = error instanceof Error ? error.message : "Publish request failed";
    if (error instanceof IdempotencyError) {
      return Response.json({ error: error.code, message, details: error.details }, { status: error.status });
    }
    const isMediaValidationError = [
      "videoUrl", "not configured", "Media URL", "Media file", "N8N_MEDIA_MAX_BYTES",
    ].some((fragment) => message.includes(fragment));
    const status = isMediaValidationError ? 400 : 502;
    return Response.json({ error: message }, { status });
  }
}
