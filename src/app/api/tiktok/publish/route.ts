import { NextRequest, NextResponse } from "next/server";
import {
  accessTokenNeedsRefresh,
  decryptSession,
  encryptSession,
  refreshTikTokSession,
  SESSION_COOKIE,
  sessionCookieMaxAge,
  tiktokFetch,
} from "@/lib/tiktok";

type InitResponse = { data: { publish_id: string; upload_url: string } };

export async function POST(request: NextRequest) {
  let session = decryptSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "Connect TikTok first." }, { status: 401 });

  try {
    const refreshed = accessTokenNeedsRefresh(session);
    if (refreshed) session = await refreshTikTokSession(session);
    const form = await request.formData();
    const video = form.get("video");
    const mode = form.get("mode") === "publish" ? "publish" : "draft";
    const caption = String(form.get("caption") || "").trim();
    const privacy = String(form.get("privacy") || "SELF_ONLY");
    const publicPostsEnabled = process.env.TIKTOK_ALLOW_PUBLIC_POSTS === "true";
    if (!(video instanceof File) || !video.size) {
      return NextResponse.json({ error: "Choose an MP4 or MOV video." }, { status: 400 });
    }
    if (video.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: "Demo uploads are limited to 50 MB." }, { status: 400 });
    }
    if (!video.type.includes("mp4") && !video.type.includes("quicktime")) {
      return NextResponse.json({ error: "Only MP4 and MOV files are accepted." }, { status: 400 });
    }
    if (mode === "publish" && !publicPostsEnabled && privacy !== "SELF_ONLY") {
      return NextResponse.json(
        { error: "Direct Post is limited to SELF_ONLY until TikTok approval." },
        { status: 400 },
      );
    }

    const sourceInfo = {
      source: "FILE_UPLOAD",
      video_size: video.size,
      chunk_size: video.size,
      total_chunk_count: 1,
    };
    const endpoint = mode === "publish"
      ? "/v2/post/publish/video/init/"
      : "/v2/post/publish/inbox/video/init/";
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
    const initialized = await tiktokFetch<InitResponse>(endpoint, session.accessToken, {
      method: "POST",
      body: JSON.stringify(body),
    });

    const upload = await fetch(initialized.data.upload_url, {
      method: "PUT",
      headers: {
        "Content-Type": video.type,
        "Content-Length": String(video.size),
        "Content-Range": `bytes 0-${video.size - 1}/${video.size}`,
      },
      body: Buffer.from(await video.arrayBuffer()),
    });
    if (!upload.ok) throw new Error(`TikTok upload returned ${upload.status}`);
    const response = NextResponse.json({
      ok: true,
      publishId: initialized.data.publish_id,
      message: mode === "publish" ? "Video submitted for direct publishing." : "Video sent to TikTok drafts.",
    });
    if (refreshed) {
      response.cookies.set(SESSION_COOKIE, encryptSession(session), {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: sessionCookieMaxAge(session),
      });
    }
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "TikTok request failed." },
      { status: 502 },
    );
  }
}
