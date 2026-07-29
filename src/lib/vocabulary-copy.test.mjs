import assert from "node:assert/strict";
import test from "node:test";
import {
  buildVocabularyCopy,
  validateVocabularyCopy,
  VOCABULARY_COPY_LIMITS,
} from "./vocabulary-copy.mjs";

const base = {
  word: "resilient",
  meaning_vi: "kiên cường, có khả năng phục hồi sau khó khăn",
  context_topic: "vượt qua thất bại",
  example_en: "she stayed resilient after the setback",
  example_vi: "cô ấy vẫn kiên cường sau trở ngại",
  channel_handle: "@daily",
};

test("fallback is deterministic, natural enough, and renderer-safe", () => {
  const first = buildVocabularyCopy(base);
  assert.deepEqual(first, buildVocabularyCopy(base));
  assert.equal(validateVocabularyCopy(first).ok, true);
  for (const [field, limit] of Object.entries(VOCABULARY_COPY_LIMITS))
    assert.ok(first[field].length <= limit, `${field} exceeds ${limit}`);
});

test("templates vary with vocabulary context instead of one fixed formula", () => {
  const outputs = [
    base,
    { ...base, word: "serendipity", meaning_vi: "sự tình cờ may mắn" },
    { ...base, word: "concise", meaning_vi: "ngắn gọn, súc tích" },
    { ...base, word: "thrive", meaning_vi: "phát triển mạnh" },
  ].map(buildVocabularyCopy);
  assert.ok(new Set(outputs.map((item) => item.hook)).size > 1);
  assert.ok(new Set(outputs.map((item) => item.cta)).size > 1);
});

test("quality gate rejects missing, long, or untranslated content", () => {
  const valid = buildVocabularyCopy(base);
  const result = validateVocabularyCopy({
    ...valid,
    hook: "",
    cta: "x".repeat(55),
    example_vi: valid.example_en,
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.join(" "), /hook is required/);
  assert.match(result.errors.join(" "), /cta exceeds 54/);
  assert.match(result.errors.join(" "), /translations must differ/);
});
