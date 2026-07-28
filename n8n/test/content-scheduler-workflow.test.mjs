import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workflow = JSON.parse(await readFile(new URL("../workflows/cal-50-content-scheduler.json", import.meta.url)));
const byName = new Map(workflow.nodes.map((node) => [node.name, node]));

test("scheduler export is inactive and supports scheduled plus manual dry-run entry", () => {
  assert.equal(workflow.active, false);
  assert.equal(byName.get("Poll Due Content").type, "n8n-nodes-base.scheduleTrigger");
  assert.equal(byName.get("Manual Dry Run").type, "n8n-nodes-base.manualTrigger");
  assert.match(JSON.stringify(workflow), /SCHEDULER_DRY_RUN/);
  assert.match(JSON.stringify(workflow), /SELF_ONLY_ENABLED/);
  assert.match(JSON.stringify(workflow), /PUBLIC_PUBLISH_ENABLED/);
});

test("scheduler selects approval fields, claims before render, and uses stable keys", () => {
  const code = byName.get("Select Validate and Claim Due").parameters.jsCode;
  assert.match(code, /review_status/);
  assert.match(code, /publish_ok/);
  assert.match(code, /publish_at/);
  assert.match(code, /claimed_at/);
  const next = (name, branch = 0) => workflow.connections[name]?.main?.[branch]?.[0]?.node;
  assert.equal(next("Select Validate and Claim Due"), "Atomic Claim Row");
  assert.equal(next("Atomic Claim Row"), "Render with Stable Key");
  assert.match(JSON.stringify(byName.get("Render with Stable Key")), /Idempotency-Key/);
  assert.match(JSON.stringify(byName.get("Upload Deterministic R2 Object")), /idempotency_key/);
});

test("publisher is gated and ambiguous outcomes reconcile before state update", () => {
  const next = (name, branch = 0) => workflow.connections[name]?.main?.[branch]?.[0]?.node;
  assert.equal(next("QA Mode Feature and Approval Gate"), "Schedule via Idempotent Backend");
  assert.equal(next("QA Mode Feature and Approval Gate", 1), "Dry Run or Approval Hold");
  assert.equal(next("Schedule via Idempotent Backend"), "Reconcile Before Retry");
  assert.equal(next("Reconcile Before Retry"), "Update Lifecycle Dashboard");
});
