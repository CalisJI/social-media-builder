import crypto from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

/** @type {Promise<void>} */
let queue = Promise.resolve();

/**
 * Serialize ledger mutations while preserving the operation's result type.
 * @template T
 * @param {() => Promise<T>} operation
 * @returns {Promise<T>}
 */
function serialized(operation) {
  const result = queue.then(operation, operation);
  queue = result.then(() => undefined, () => undefined);
  return result;
}

function ledgerFile() {
  const value = process.env.VOCABULARY_LEDGER_FILE;
  if (!value) throw new Error("VOCABULARY_LEDGER_FILE is not configured");
  return value;
}

function now() {
  return new Date().toISOString();
}

function sourceKey(sourceType, sourceId, sourceItemId) {
  return `${sourceType}:${sourceId}:${sourceItemId}`;
}

function clean(value, name, max = 256) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${name} is required`);
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (trimmed.length > max) throw new Error(`${name} exceeds ${max} characters`);
  return trimmed;
}

function normalizeSourceType(value) {
  const sourceType = clean(value, "source_type", 24).toLowerCase();
  if (sourceType !== "sheet" && sourceType !== "discord" && sourceType !== "manual") {
    throw new Error("source_type must be sheet, discord, or manual");
  }
  return sourceType;
}

function normalizeLedger(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("ledger must be an object");
  }
  const candidate = input;
  if (!Array.isArray(candidate.entries)) {
    return { version: 1, updatedAt: now(), entries: [] };
  }
  return {
    version: 1,
    updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : now(),
    entries: candidate.entries,
  };
}

async function readLedgerFile() {
  try {
    const raw = await readFile(ledgerFile(), "utf8");
    return normalizeLedger(JSON.parse(raw));
  } catch (error) {
    if (error?.code === "ENOENT") {
      return { version: 1, updatedAt: now(), entries: [] };
    }
    throw error;
  }
}

async function writeLedgerFile(ledger) {
  const target = ledgerFile();
  const directory = dirname(target);
  const temporary = `${target}.${process.pid}.${crypto.randomUUID()}.tmp`;
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await writeFile(temporary, `${JSON.stringify(ledger, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await rename(temporary, target);
}

function applyUpsert(existing, sourceType, sourceId, batchId, item) {
  const sourceItemId = clean(item.sourceItemId, "source_item_id", 128);
  const timestamp = now();
  const id = existing?.id || crypto.randomUUID();
  const publishedAt = existing?.publishedAt ?? null;
  const status = existing?.status === "published" ? "published" : "pending";
  return {
    id,
    sourceKey: sourceKey(sourceType, sourceId, sourceItemId),
    sourceType,
    sourceId,
    sourceItemId,
    batchId,
    templateKey: clean(item.template_key ?? existing?.templateKey ?? "vocabulary-pastel-v1", "template_key", 80),
    status,
    word: clean(item.word, "word", 64),
    meaning_vi: clean(item.meaning_vi, "meaning_vi", 200),
    example_en: item.example_en == null || !String(item.example_en).trim() ? null : clean(item.example_en, "example_en", 400),
    example_vi: item.example_vi == null || !String(item.example_vi).trim() ? null : clean(item.example_vi, "example_vi", 400),
    ipa: item.ipa == null || !String(item.ipa).trim() ? null : clean(item.ipa, "ipa", 64),
    part_of_speech: item.part_of_speech == null || !String(item.part_of_speech).trim() ? null : clean(item.part_of_speech, "part_of_speech", 64),
    cta: item.cta == null || !String(item.cta).trim() ? null : clean(item.cta, "cta", 120),
    channel_handle: item.channel_handle == null || !String(item.channel_handle).trim() ? null : clean(item.channel_handle, "channel_handle", 64),
    publish_at: item.publish_at == null || !String(item.publish_at).trim() ? null : clean(item.publish_at, "publish_at", 64),
    renderJobId: existing?.renderJobId ?? null,
    publishId: existing?.publishId ?? null,
    videoUrl: existing?.videoUrl ?? null,
    notes: item.notes == null || !String(item.notes).trim() ? existing?.notes ?? null : clean(item.notes, "notes", 500),
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
    publishedAt,
  };
}

export async function ingestVocabularyEntries(options) {
  return serialized(async () => {
    const ledger = await readLedgerFile();
    const byKey = new Map(ledger.entries.map((entry) => [entry.sourceKey, entry]));
    let created = 0;
    let updated = 0;
    const nextEntries = options.entries.map((item) => {
      const key = sourceKey(options.sourceType, options.sourceId, clean(item.sourceItemId, "source_item_id", 128));
      const existing = byKey.get(key);
      const next = applyUpsert(existing, options.sourceType, options.sourceId, options.batchId, item);
      if (existing) updated += 1;
      else created += 1;
      byKey.set(key, next);
      return next;
    });
    ledger.entries = [...byKey.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    ledger.updatedAt = now();
    await writeLedgerFile(ledger);
    return { created, updated, entries: nextEntries };
  });
}

export async function markVocabularyPublished(options) {
  return serialized(async () => {
    const ledger = await readLedgerFile();
    const key = sourceKey(options.sourceType, options.sourceId, options.sourceItemId);
    const timestamp = now();
    const existing = ledger.entries.find((entry) => entry.sourceKey === key);
    const entry = existing
      ? {
          ...existing,
          status: "published",
          publishId: clean(options.publishId, "publishId", 128),
          videoUrl: options.videoUrl == null || !String(options.videoUrl).trim() ? existing.videoUrl : clean(options.videoUrl, "videoUrl", 2048),
          renderJobId: options.renderJobId == null || !String(options.renderJobId).trim() ? existing.renderJobId : clean(options.renderJobId, "renderJobId", 128),
          publishedAt: existing.publishedAt ?? timestamp,
          updatedAt: timestamp,
        }
      : {
          id: crypto.randomUUID(),
          sourceKey: key,
          sourceType: options.sourceType,
          sourceId: options.sourceId,
          sourceItemId: options.sourceItemId,
          batchId: options.renderJobId ?? options.publishId,
          templateKey: "vocabulary-pastel-v1",
          status: "published",
          word: "",
          meaning_vi: "",
          example_en: null,
          example_vi: null,
          ipa: null,
          part_of_speech: null,
          cta: null,
          channel_handle: null,
          publish_at: null,
          renderJobId: options.renderJobId ?? null,
          publishId: clean(options.publishId, "publishId", 128),
          videoUrl: options.videoUrl == null || !String(options.videoUrl).trim() ? null : clean(options.videoUrl, "videoUrl", 2048),
          notes: null,
          createdAt: timestamp,
          updatedAt: timestamp,
          publishedAt: timestamp,
        };
    if (existing) {
      ledger.entries = ledger.entries.map((item) => (item.sourceKey === key ? entry : item));
    } else {
      ledger.entries = [entry, ...ledger.entries];
    }
    ledger.updatedAt = timestamp;
    await writeLedgerFile(ledger);
    return entry;
  });
}

export async function listVocabularyEntries(options = {}) {
  return serialized(async () => {
    const ledger = await readLedgerFile();
    return ledger.entries
      .filter((entry) => !options.sourceType || entry.sourceType === options.sourceType)
      .filter((entry) => !options.status || entry.status === options.status)
      .slice(0, options.limit && options.limit > 0 ? options.limit : 100);
  });
}

export function validateVocabularySourceType(value) {
  return normalizeSourceType(value);
}
