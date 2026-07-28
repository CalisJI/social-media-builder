import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const file = new URL("../workflows/cal-52-discord-vocabulary-ingest.json", import.meta.url);
const workflow = JSON.parse(await readFile(file, "utf8"));
const byName = new Map(workflow.nodes.map((node) => [node.name, node]));

test("workflow is safely importable and uses the existing credentials", () => {
  assert.equal(workflow.active, false);
  assert.equal(byName.get("Poll Every Minute")?.type, "n8n-nodes-base.scheduleTrigger");
  assert.equal(byName.get("Get Recent Discord Messages")?.type, "n8n-nodes-base.discord");
  assert.match(JSON.stringify(byName.get("Get Recent Discord Messages")), /Discord Bot Account/);
  assert.match(JSON.stringify(byName.get("Read Admin Vocabulary Existing")), /Google Service Account account/);
  assert.match(JSON.stringify(workflow), /1bfzprj4G7VrnPZmC3qMXwF5hL8qLHNYbmr8z1lAoSU0/);
});

test("plain Discord words and bot mentions are accepted", () => {
  const normalize = byName.get("Normalize Discord Words").parameters.jsCode;
  assert.match(normalize, /replace\(\/\^<@!\?/);
  assert.match(normalize, /content\.length <= 120/);
  assert.match(normalize, /vocab-batch/);
  assert.match(normalize, /1529722358309584987/);
});

test("admin sheet has exactly the three requested columns", () => {
  const build = byName.get("Build One Admin Vocabulary Row").parameters.jsCode;
  const append = byName.get("Append Admin Vocabulary Row");
  assert.match(build, /'Số thứ tự'/);
  assert.match(build, /'Từ vựng'/);
  assert.match(build, /Approval: ''/);
  assert.equal(append.parameters.range, "AdminVocabulary!A:C");
});

test("approval sync remains editorially locked", () => {
  const build = byName.get("Build One Approved Content Row").parameters.jsCode;
  assert.match(build, /approved/);
  assert.match(build, /publish_ok: ''/);
  assert.match(build, /review_status: 'needs_review'/);
  assert.match(build, /status: 'needs_review'/);
  assert.equal(byName.get("Append Approved Content Row").parameters.range, "Content!A:AD");
});

test("schedule and manual triggers fan out to Discord intake and approval sync", () => {
  const targets = (name) => workflow.connections[name].main[0].map((edge) => edge.node);
  assert.deepEqual(targets("Poll Every Minute"), [
    "Get Recent Discord Messages",
    "Read Admin Vocabulary Approvals",
  ]);
  assert.deepEqual(targets("Manual Test Trigger"), [
    "Get Recent Discord Messages",
    "Read Admin Vocabulary Approvals",
  ]);
});
