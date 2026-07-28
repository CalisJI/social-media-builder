import { isAuthorizedServiceRequest } from "@/lib/internal-api";
import { markVocabularyPublished, validateVocabularySourceType } from "@/lib/vocabulary-ledger.mjs";

function readString(value: unknown, name: string, max = 128): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${name} is required`);
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (trimmed.length > max) throw new Error(`${name} exceeds ${max} characters`);
  return trimmed;
}

export async function POST(request: Request) {
  try {
    if (!isAuthorizedServiceRequest(request)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const input = await request.json() as Record<string, unknown>;
    const source = (input.source && typeof input.source === "object" && !Array.isArray(input.source))
      ? input.source as Record<string, unknown>
      : {};
    const sourceType = validateVocabularySourceType(source.type ?? input.source_type);
    const sourceId = readString(source.id ?? input.source_id, "source_id", 128);
    const sourceItemId = readString(source.item_id ?? input.source_item_id, "source_item_id", 128);
    const publishId = readString(input.publishId ?? input.publish_id, "publishId", 128);
    const videoUrl = typeof input.videoUrl === "string" ? input.videoUrl : typeof input.video_url === "string" ? input.video_url : null;
    const renderJobId = typeof input.renderJobId === "string" ? input.renderJobId : typeof input.render_job_id === "string" ? input.render_job_id : null;
    const entry = await markVocabularyPublished({
      sourceType,
      sourceId,
      sourceItemId,
      publishId,
      videoUrl,
      renderJobId,
    });
    return Response.json({ ok: true, entry });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Publish tracking failed";
    return Response.json({ error: message }, { status: 400 });
  }
}
