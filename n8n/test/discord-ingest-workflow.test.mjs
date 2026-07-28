import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const file = new URL("../workflows/cal-52-discord-vocabulary-ingest.json", import.meta.url);
const workflow = JSON.parse(await readFile(file, "utf8"));
const byName = new Map(workflow.nodes.map((node) => [node.name, node]));

test("discord ingest workflow is safely importable, credential-bound, and sheet-backed", () => {
  assert.equal(workflow.active, false);
  assert.equal(byName.get("Poll Discord Every Minute")?.type, "n8n-nodes-base.scheduleTrigger");
  assert.equal(byName.get("Get Recent Discord Messages")?.type, "n8n-nodes-base.discord");
  assert.match(JSON.stringify(byName.get("Get Recent Discord Messages")), /Discord Bot Account/);
  assert.equal(byName.get("Read Content Sheet")?.type, "n8n-nodes-base.googleSheets");
  assert.equal(byName.get("Append One Draft Row")?.type, "n8n-nodes-base.googleSheets");
  assert.match(JSON.stringify(byName.get("Read Content Sheet")), /1bfzprj4G7VrnPZmC3qMXwF5hL8qLHNYbmr8z1lAoSU0/);
  assert.match(JSON.stringify(byName.get("Append One Draft Row")), /Google Service Account account/);
});

test("discord ingest contract enforces channel, parsing, dedupe, and editorial lockout", () => {
  const normalize = byName.get("Select One Vocabulary Message").parameters.jsCode;
  const dedupe = byName.get("Build One New Sheet Row").parameters.jsCode;
  assert.match(normalize, /1529722358309584987/);
  assert.match(normalize, /vocab-batch/);
  assert.match(normalize, /publish_ok/);
  assert.match(normalize, /needs_review/);
  assert.match(dedupe, /source_ref/);
  assert.match(dedupe, /dedupe_key/);
  assert.match(dedupe, /sourceRefs/);
  assert.match(dedupe, /return \[\]/);
});

test("workflow order is schedule or manual to Discord poll, normalize, read, dedupe, append", () => {
  const next = (name) => workflow.connections[name]?.main?.[0]?.[0]?.node;
  assert.equal(next("Poll Discord Every Minute"), "Get Recent Discord Messages");
  assert.equal(next("Manual Test Trigger"), "Get Recent Discord Messages");
  assert.equal(next("Get Recent Discord Messages"), "Select One Vocabulary Message");
  assert.equal(next("Select One Vocabulary Message"), "Read Content Sheet");
  assert.equal(next("Read Content Sheet"), "Build One New Sheet Row");
  assert.equal(next("Build One New Sheet Row"), "Append One Draft Row");
});
