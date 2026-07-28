import { isAuthorizedServiceRequest } from "@/lib/internal-api";
import { ingestVocabularyEntries, validateVocabularySourceType } from "@/lib/vocabulary-ledger.mjs";

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
    const batchId = readString(input.batch_id ?? input.batchId ?? source.batch_id ?? sourceId, "batch_id", 128);
    const rawEntries = Array.isArray(input.entries) ? input.entries : Array.isArray(input.items) ? input.items : [];
    if (!rawEntries.length) {
      return Response.json({ error: "entries must contain at least one item" }, { status: 400 });
    }
    const entries = rawEntries.map((item, index) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        throw new Error(`entries[${index}] must be an object`);
      }
      const row = item as Record<string, unknown>;
      return {
        sourceItemId: readString(row.source_item_id ?? row.sourceItemId ?? row.row_id ?? row.discord_message_id ?? row.id ?? `${index + 1}`, "source_item_id", 128),
        word: readString(row.word, "word", 64),
        meaning_vi: readString(row.meaning_vi, "meaning_vi", 200),
        example_en: typeof row.example_en === "string" ? row.example_en : row.exampleEn as string | null | undefined,
        example_vi: typeof row.example_vi === "string" ? row.example_vi : row.exampleVi as string | null | undefined,
        ipa: typeof row.ipa === "string" ? row.ipa : null,
        part_of_speech: typeof row.part_of_speech === "string" ? row.part_of_speech : row.partOfSpeech as string | null | undefined,
        cta: typeof row.cta === "string" ? row.cta : null,
        template_key: typeof row.template_key === "string" ? row.template_key : row.templateKey as string | null | undefined,
        channel_handle: typeof row.channel_handle === "string" ? row.channel_handle : row.channelHandle as string | null | undefined,
        publish_at: typeof row.publish_at === "string" ? row.publish_at : row.publishAt as string | null | undefined,
        notes: typeof row.notes === "string" ? row.notes : null,
      };
    });
    const outcome = await ingestVocabularyEntries({ batchId, sourceType, sourceId, entries });
    return Response.json({
      ok: true,
      batchId,
      sourceType,
      sourceId,
      created: outcome.created,
      updated: outcome.updated,
      entries: outcome.entries,
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ingest failed";
    return Response.json({ error: message }, { status: 400 });
  }
}
