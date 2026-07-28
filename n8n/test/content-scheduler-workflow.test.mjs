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
  const prepare = byName.get("Prepare Stable Claim").parameters.jsCode;
  assert.match(prepare, /status:'queued'/);
  assert.match(prepare, /claimed_at:claimedAt/);
  assert.match(prepare, /claim_owner:owner/);
  assert.match(prepare, /idempotency_key:key/);
  const verify = byName.get("Continue Only Owned Claims").parameters.jsCode;
  assert.match(verify, /claim_owner/);
  assert.match(verify, /idempotency_key/);
  const next = (name, branch = 0) => workflow.connections[name]?.main?.[branch]?.[0]?.node;
  assert.equal(next("Select Validate and Claim Due"), "Prepare Stable Claim");
  assert.equal(next("Prepare Stable Claim"), "Atomic Claim Row");
  assert.equal(next("Atomic Claim Row"), "Read Back Claims");
  assert.equal(next("Read Back Claims"), "Continue Only Owned Claims");
  assert.equal(next("Continue Only Owned Claims"), "Render with Stable Key");
  assert.equal(next("Render with Stable Key"), "Classify Render Result");
  assert.equal(next("Classify Render Result"), "Retry Render?");
  assert.equal(next("Retry Render?"), "Render Retry Backoff");
  assert.equal(next("Retry Render?", 1), "Download Rendered MP4");
  assert.equal(next("Render Retry Backoff"), "Render with Stable Key");
  assert.equal(next("Download Rendered MP4"), "Upload Deterministic R2 Object");
  assert.equal(next("Upload Deterministic R2 Object"), "Classify R2 Result");
  assert.equal(next("Classify R2 Result"), "Retry R2?");
  assert.equal(next("Retry R2?"), "R2 Retry Backoff");
  assert.equal(next("Retry R2?", 1), "Build Gated Publish Payload");
  assert.equal(next("R2 Retry Backoff"), "Upload Deterministic R2 Object");
  assert.equal(byName.get("Upload Deterministic R2 Object").parameters.binaryPropertyName, "video");
  assert.match(JSON.stringify(byName.get("Render with Stable Key")), /Idempotency-Key/);
  assert.match(JSON.stringify(byName.get("Upload Deterministic R2 Object")), /idempotency_key/);
  for (const name of ["Classify Render Result", "Classify R2 Result"]) {
    const classify = byName.get(name).parameters.jsCode;
    assert.match(classify, /\[408,425,429\]/);
    assert.match(classify, /attempt>=3/);
    assert.match(classify, /2\*\*\(attempt-1\)/);
    assert.match(classify, /NON_RETRYABLE/);
  }
});

test("publisher is gated and ambiguous outcomes reconcile before state update", () => {
  const next = (name, branch = 0) => workflow.connections[name]?.main?.[branch]?.[0]?.node;
  assert.equal(next("QA Mode Feature and Approval Gate"), "Schedule via Idempotent Backend");
  assert.equal(next("QA Mode Feature and Approval Gate", 1), "Dry Run or Approval Hold");
  assert.equal(next("Schedule via Idempotent Backend"), "Reconcile Before Retry");
  assert.equal(next("Reconcile Before Retry"), "Normalize Lifecycle State");
  assert.equal(next("Dry Run or Approval Hold"), "Normalize Lifecycle State");
  assert.equal(next("Normalize Lifecycle State"), "Update Lifecycle Dashboard");
  assert.match(byName.get("Normalize Lifecycle State").parameters.jsCode, /content_id/);
});
