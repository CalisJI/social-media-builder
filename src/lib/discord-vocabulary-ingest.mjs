import { createHash } from "node:crypto";

const MAX_ENTRIES = 50;
const ALLOWED_STATES = new Set(["draft", "needs_review"]);

function text(value) {
  return typeof value === "string" ? value.trim().normalize("NFKC") : "";
}

export function dedupeKey(entry) {
  const identity = [entry.word, entry.meaning, entry.context]
    .map((value) => text(value).toLocaleLowerCase("vi"))
    .join("\u001f");
  return createHash("sha256").update(identity).digest("hex");
}

export function parseDiscordVocabulary(content) {
  const input = text(content);
  const match = input.match(/^!(vocab|vocab-batch)\s+([\s\S]+)$/i);
  if (!match) throw new Error("Expected !vocab <JSON> or !vocab-batch <JSON array>");

  let payload;
  try {
    payload = JSON.parse(match[2].replace(/^```(?:json)?\s*|\s*```$/gi, ""));
  } catch {
    throw new Error("Payload must be valid JSON");
  }

  const entries = match[1].toLowerCase() === "vocab" ? [payload] : payload;
  if (!Array.isArray(entries) || entries.length < 1 || entries.length > MAX_ENTRIES)
    throw new Error(`Batch must contain 1-${MAX_ENTRIES} entries`);

  return entries.map((raw, index) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw))
      throw new Error(`Entry ${index + 1} must be an object`);
    const word = text(raw.word);
    const meaning = text(raw.meaning);
    const context = text(raw.context);
    if (!word) throw new Error(`Entry ${index + 1} requires word`);
    if (word.length > 120 || meaning.length > 1000 || context.length > 1000)
      throw new Error(`Entry ${index + 1} exceeds field length`);

    let requestedAt = null;
    if (raw.at != null && text(raw.at)) {
      const parsed = new Date(raw.at);
      if (Number.isNaN(parsed.valueOf())) throw new Error(`Entry ${index + 1} has invalid at`);
      requestedAt = parsed.toISOString();
    }
    return { word, meaning, context, requestedAt };
  });
}

/**
 * store must implement findMessage(messageId), findDedupeKeys(keys), appendRows(rows).
 * appendRows must be atomic or use a unique constraint on source_message_id + item_index.
 */
export async function ingestDiscordMessage(event, config, store) {
  const messageId = text(event?.messageId);
  const channelId = text(event?.channelId);
  const userId = text(event?.userId);
  if (!messageId) return rejected("missing_message_id");
  if (!config.allowedChannelIds?.includes(channelId) || !config.allowedUserIds?.includes(userId))
    return rejected("unauthorized");
  if (await store.findMessage(messageId))
    return { status: "duplicate", reason: "message_id", accepted: [], duplicates: [] };

  let entries;
  try {
    entries = parseDiscordVocabulary(event.content);
  } catch (error) {
    return rejected("malformed", error.message);
  }

  const prepared = entries.map((entry, itemIndex) => ({
    ...entry,
    itemIndex,
    dedupeKey: dedupeKey(entry),
  }));
  const existing = await store.findDedupeKeys(prepared.map((entry) => entry.dedupeKey));
  const seen = new Set(existing);
  const accepted = [];
  const duplicates = [];
  for (const entry of prepared) {
    if (seen.has(entry.dedupeKey)) {
      duplicates.push({ itemIndex: entry.itemIndex, word: entry.word, reason: "dedupe_key" });
      continue;
    }
    seen.add(entry.dedupeKey);
    accepted.push(entry);
  }

  const requestedState = text(config.initialState) || "needs_review";
  const initialState = ALLOWED_STATES.has(requestedState) ? requestedState : "needs_review";
  const rows = accepted.map((entry) => ({
    word: entry.word,
    meaning: entry.meaning,
    context: entry.context,
    requested_at: entry.requestedAt,
    status: initialState,
    publish_ok: "",
    editorial_approved_at: "",
    source: "discord",
    source_message_id: messageId,
    source_channel_id: channelId,
    source_user_id: userId,
    source_item_index: entry.itemIndex,
    dedupe_key: entry.dedupeKey,
    ingested_at: new Date(config.now?.() ?? Date.now()).toISOString(),
  }));
  if (rows.length) await store.appendRows(rows);
  return { status: "accepted", accepted: rows, duplicates };
}

function rejected(reason, detail) {
  return { status: "rejected", reason, ...(detail ? { detail } : {}), accepted: [], duplicates: [] };
}

export class MemorySheetStore {
  constructor(rows = []) { this.rows = rows.map((row) => ({ ...row })); }
  async findMessage(id) { return this.rows.some((row) => row.source_message_id === id); }
  async findDedupeKeys(keys) {
    const wanted = new Set(keys);
    return this.rows.filter((row) => wanted.has(row.dedupe_key)).map((row) => row.dedupe_key);
  }
  async appendRows(rows) { this.rows.push(...rows.map((row) => ({ ...row }))); }
}
