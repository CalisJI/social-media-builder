import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { accessTokenNeedsRefresh, decryptSession, SESSION_COOKIE, tiktokFetch } from "@/lib/tiktok";
import PublishForm from "./PublishForm";
import styles from "./studio.module.css";

type UserResponse = { data: { user: Record<string, string | number> } };
type VideosResponse = { data: { videos?: Array<Record<string, string | number>> } };
type CreatorResponse = { data: { privacy_level_options?: string[] } };

export default async function StudioPage() {
  const session = decryptSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) redirect("/?error=session_required");
  if (accessTokenNeedsRefresh(session)) redirect("/api/tiktok/refresh");

  const userFields = [
    "open_id", "union_id", "avatar_url", "display_name", "bio_description",
    "profile_deep_link", "is_verified", "follower_count", "following_count",
    "likes_count", "video_count",
  ].join(",");
  let user: Record<string, string | number> = {};
  let videos: Array<Record<string, string | number>> = [];
  let privacyOptions: string[] = ["SELF_ONLY"];
  let apiError = "";
  try {
    const [userResult, videoResult, creatorResult] = await Promise.all([
      tiktokFetch<UserResponse>(`/v2/user/info/?fields=${userFields}`, session.accessToken),
      tiktokFetch<VideosResponse>(
        "/v2/video/list/?fields=id,title,cover_image_url,share_url,create_time,duration",
        session.accessToken,
        { method: "POST", body: JSON.stringify({ max_count: 10 }) },
      ),
      tiktokFetch<CreatorResponse>(
        "/v2/post/publish/creator_info/query/",
        session.accessToken,
        { method: "POST", body: "{}" },
      ),
    ]);
    user = userResult.data.user;
    videos = videoResult.data.videos ?? [];
    privacyOptions = creatorResult.data.privacy_level_options ?? privacyOptions;
  } catch (error) {
    apiError = error instanceof Error ? error.message : "TikTok data could not be loaded.";
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}>Social Media Builder</Link>
        <form action="/api/tiktok/disconnect" method="post"><button>Disconnect TikTok</button></form>
      </header>
      <section className={styles.account}>
        <div className={styles.avatar}>
          {user.avatar_url ? <Image src={String(user.avatar_url)} alt="TikTok avatar" width={88} height={88} unoptimized /> : "TT"}
        </div>
        <div>
          <p className={styles.kicker}>Connected TikTok account</p>
          <h1>{String(user.display_name || "TikTok creator")}</h1>
          <p>{String(user.bio_description || "Profile connected and ready for creator-controlled publishing.")}</p>
        </div>
        <div className={styles.stats}>
          <span><strong>{Number(user.follower_count || 0).toLocaleString()}</strong>Followers</span>
          <span><strong>{Number(user.likes_count || 0).toLocaleString()}</strong>Likes</span>
          <span><strong>{Number(user.video_count || 0).toLocaleString()}</strong>Videos</span>
        </div>
      </section>
      {apiError && <p className={styles.apiError}>TikTok returned: {apiError}. Reconnect after confirming the approved scopes.</p>}
      <div className={styles.grid}>
        <section className={styles.panel}>
          <p className={styles.step}>01 / Review account history</p>
          <h2>Recent TikTok videos</h2>
          <div className={styles.videoList}>
            {videos.length ? videos.map((video) => (
              <a href={String(video.share_url || "#")} target="_blank" rel="noreferrer" key={String(video.id)}>
                <span>{String(video.title || "Untitled TikTok video")}</span>
                <small>{Number(video.duration || 0)} sec · View on TikTok ↗</small>
              </a>
            )) : <p className={styles.empty}>No recent videos returned for this account.</p>}
          </div>
        </section>
        <section className={styles.panel}>
          <p className={styles.step}>02 / Prepare and confirm</p>
          <h2>Send a video</h2>
          <PublishForm privacyOptions={privacyOptions} />
        </section>
      </div>
    </main>
  );
}
