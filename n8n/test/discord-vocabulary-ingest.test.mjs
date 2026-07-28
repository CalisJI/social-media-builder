import assert from "node:assert/strict";
import test from "node:test";
import { dedupeKey, ingestDiscordMessage, MemorySheetStore, parseDiscordVocabulary } from "../../src/lib/discord-vocabulary-ingest.mjs";

const config = { allowedChannelIds: ["channel-1"], allowedUserIds: ["user-1"], now: () => 0 };
const event = (content, extra = {}) => ({ messageId: "message-1", channelId: "channel-1", userId: "user-1", content, ...extra });

test("single entry accepts optional fields", async () => {
  const store = new MemorySheetStore();
  const result = await ingestDiscordMessage(event('!vocab {"word":" resilience ","meaning":"khả năng phục hồi","context":"systems","at":"2030-01-02T03:04:05Z"}'), config, store);
  assert.equal(result.status, "accepted");
  assert.equal(result.accepted[0].word, "resilience");
  assert.equal(result.accepted[0].requested_at, "2030-01-02T03:04:05.000Z");
});

test("single entry only requires word", () => {
  assert.deepEqual(parseDiscordVocabulary('!vocab {"word":"serendipity"}')[0], { word: "serendipity", meaning: "", context: "", requestedAt: null });
});

test("batch accepts multiple entries", () => {
  assert.equal(parseDiscordVocabulary('!vocab-batch [{"word":"one"},{"word":"two"}]').length, 2);
});

test("same message replay creates no duplicate rows", async () => {
  const store = new MemorySheetStore();
  const input = event('!vocab {"word":"stable"}');
  assert.equal((await ingestDiscordMessage(input, config, store)).status, "accepted");
  assert.equal((await ingestDiscordMessage(input, config, store)).reason, "message_id");
  assert.equal(store.rows.length, 1);
});

test("same normalized content from another message is deduplicated", async () => {
  const store = new MemorySheetStore();
  await ingestDiscordMessage(event('!vocab {"word":" MQTT ","meaning":"Protocol"}'), config, store);
  const result = await ingestDiscordMessage(event('!vocab {"word":"mqtt","meaning":"protocol"}', { messageId: "message-2" }), config, store);
  assert.equal(result.duplicates[0].reason, "dedupe_key");
  assert.equal(store.rows.length, 1);
});

test("malformed JSON is rejected", async () => {
  assert.equal((await ingestDiscordMessage(event("!vocab nope"), config, new MemorySheetStore())).reason, "malformed");
});

test("entry without word is rejected", async () => {
  assert.match((await ingestDiscordMessage(event('!vocab {"meaning":"x"}'), config, new MemorySheetStore())).detail, /requires word/);
});

test("multi-sense vocabulary is represented as separate contextual entries", async () => {
  const store = new MemorySheetStore();
  const result = await ingestDiscordMessage(event('!vocab-batch [{"word":"bank","meaning":"financial institution","context":"money"},{"word":"bank","meaning":"river edge","context":"geography"}]'), config, store);
  assert.equal(result.accepted.length, 2);
  assert.notEqual(result.accepted[0].dedupe_key, result.accepted[1].dedupe_key);
});

test("unauthorized channel is rejected before parsing", async () => {
  assert.equal((await ingestDiscordMessage(event("invalid", { channelId: "other" }), config, new MemorySheetStore())).reason, "unauthorized");
});

test("unauthorized user is rejected", async () => {
  assert.equal((await ingestDiscordMessage(event('!vocab {"word":"x"}', { userId: "other" }), config, new MemorySheetStore())).reason, "unauthorized");
});

test("ingestion can never set publish approval", async () => {
  const result = await ingestDiscordMessage(event('!vocab {"word":"safe"}'), { ...config, initialState: "published" }, new MemorySheetStore());
  assert.equal(result.accepted[0].status, "needs_review");
  assert.equal(result.accepted[0].publish_ok, "");
  assert.equal(result.accepted[0].editorial_approved_at, "");
});

test("duplicate entries inside one batch produce one row", async () => {
  const store = new MemorySheetStore();
  const result = await ingestDiscordMessage(event('!vocab-batch [{"word":"same"},{"word":" same "}]'), config, store);
  assert.equal(result.accepted.length, 1);
  assert.equal(result.duplicates.length, 1);
});

test("dedupe key excludes requested schedule", () => {
  assert.equal(dedupeKey({ word: "x", meaning: "y", context: "z", requestedAt: "2030-01-01" }), dedupeKey({ word: "x", meaning: "y", context: "z", requestedAt: "2040-01-01" }));
});
