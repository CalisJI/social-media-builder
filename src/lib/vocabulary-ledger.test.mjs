import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { ingestVocabularyEntries, listVocabularyEntries, markVocabularyPublished } from "./vocabulary-ledger.mjs";

test("ingests and marks vocabulary ledger entries", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "vocab-ledger-"));
  const file = path.join(directory, "ledger.json");
  const previous = process.env.VOCABULARY_LEDGER_FILE;
  process.env.VOCABULARY_LEDGER_FILE = file;
  try {
    const ingest = await ingestVocabularyEntries({
      batchId: "batch-001",
      sourceType: "sheet",
      sourceId: "sheet-abc",
      entries: [
        {
          sourceItemId: "row-1",
          word: "resilient",
          meaning_vi: "kiên cường",
          example_en: "She stayed resilient.",
          example_vi: "Cô ấy vẫn kiên cường.",
          template_key: "vocabulary-pastel-v1",
        },
      ],
    });
    assert.equal(ingest.created, 1);
    assert.equal(ingest.updated, 0);
    const published = await markVocabularyPublished({
      sourceType: "sheet",
      sourceId: "sheet-abc",
      sourceItemId: "row-1",
      publishId: "pub-001",
      videoUrl: "https://example.com/video.mp4",
      renderJobId: "batch-001-01",
    });
    assert.equal(published.status, "published");
    assert.equal(published.publishId, "pub-001");
    const entries = await listVocabularyEntries({ status: "published" });
    assert.equal(entries.length, 1);
    assert.equal(entries[0].word, "resilient");
    const fileData = JSON.parse(await readFile(file, "utf8"));
    assert.equal(fileData.entries[0].sourceKey, "sheet:sheet-abc:row-1");
  } finally {
    if (previous === undefined) delete process.env.VOCABULARY_LEDGER_FILE;
    else process.env.VOCABULARY_LEDGER_FILE = previous;
  }
});
