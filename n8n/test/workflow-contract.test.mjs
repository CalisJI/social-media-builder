import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const file = new URL("../workflows/cal-35-vocabulary-publisher.json", import.meta.url);
const workflow = JSON.parse(await readFile(file, "utf8"));
const byName = new Map(workflow.nodes.map((node) => [node.name, node]));

test("workflow is inactive, manual, and contains no secret values", () => {
  assert.equal(workflow.active, false);
  assert.equal(byName.get("Manual Trigger")?.type, "n8n-nodes-base.manualTrigger");
  const serialized = JSON.stringify(workflow);
  for (const marker of ["client_secret", "access_token", "refresh_token", "Bearer ey", "AKIA"])
    assert.equal(serialized.includes(marker), false, `secret-like marker: ${marker}`);
});

test("contract covers batch, schedule, idempotency, bounded retries and approval", () => {
  assert.match(byName.get("Validate Batch 1-50").parameters.jsCode, /entries\.length>50/);
  assert.equal(byName.get("Render Video").maxTries, 3);
  assert.equal(byName.get("Render Video").parameters.headerParameters.parameters[0].name, "Idempotency-Key");
  assert.equal(byName.get("Backend Schedule Publish").maxTries, 3);
  assert.equal(byName.get("Wait Until publish_at").parameters.resume, "specificTime");
  assert.match(JSON.stringify(byName.get("Explicit Publish Approval Gate")), /N8N_CAL3_PUBLISH_ENABLED/);
  assert.match(byName.get("Classify Publish Result").parameters.jsCode, /RETRYABLE/);
  assert.match(byName.get("Classify Publish Result").parameters.jsCode, /NON_RETRYABLE|retryable/);
});

test("main path is validate to render to R2 to wait to gated backend publish", () => {
  const next = (name, branch=0) => workflow.connections[name]?.main?.[branch]?.[0]?.node;
  assert.equal(next("Validate Batch 1-50"), "Render Video");
  assert.equal(next("Classify Render Result"), "Download Rendered MP4");
  assert.equal(next("Download Rendered MP4"), "Upload MP4 to R2");
  assert.equal(next("Build Media URL"), "Wait Until publish_at");
  assert.equal(next("Wait Until publish_at"), "Explicit Publish Approval Gate");
  assert.equal(next("Explicit Publish Approval Gate", 0), "Backend Schedule Publish");
  assert.equal(next("Explicit Publish Approval Gate", 1), "Held for Approval");
});
