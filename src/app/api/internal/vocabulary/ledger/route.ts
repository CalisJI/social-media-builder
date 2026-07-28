import { isAuthorizedServiceRequest } from "@/lib/internal-api";
import { listVocabularyEntries, validateVocabularySourceType } from "@/lib/vocabulary-ledger.mjs";

export async function GET(request: Request) {
  try {
    if (!isAuthorizedServiceRequest(request)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = new URL(request.url);
    const sourceType = url.searchParams.get("source_type") || undefined;
    const status = url.searchParams.get("status") || undefined;
    const limit = Number(url.searchParams.get("limit") || 100);
    const validatedSourceType = sourceType ? validateVocabularySourceType(sourceType) : undefined;
    const entries = await listVocabularyEntries({
      sourceType: validatedSourceType,
      status: status === "pending" || status === "published" ? status : undefined,
      limit: Number.isFinite(limit) && limit > 0 ? limit : 100,
    });
    return Response.json({ ok: true, entries });
  } catch (error) {
    const message = error instanceof Error ? error.message : "List failed";
    return Response.json({ error: message }, { status: 400 });
  }
}
