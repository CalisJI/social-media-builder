import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workflow = JSON.parse(await readFile(new URL("../workflows/cal-50-manual-retry.json", import.meta.url)));
const byName = new Map(workflow.nodes.map((node) => [node.name, node]));

test("manual retry is inactive, explicit, auditable, and sheet-backed", () => {
  assert.equal(workflow.active, false);
  assert.equal(byName.get("Manual Retry Trigger").type, "n8n-nodes-base.manualTrigger");
  assert.match(byName.get("Retry Input").parameters.jsCode, /CAL50_MANUAL_RETRY_CONTENT_ID/);
  assert.match(byName.get("Retry Input").parameters.jsCode, /CAL50_MANUAL_RETRY_APPROVED_BY/);
  assert.equal(byName.get("Queue Existing Idempotency Key").type, "n8n-nodes-base.googleSheets");
});

test("manual retry rejects ambiguous/published rows and preserves idempotency", () => {
  const code = byName.get("Validate Safe Manual Retry").parameters.jsCode;
  assert.match(code, /row\.status!=='failed'/);
  assert.match(code, /RECONCILE_REQUIRED/);
  assert.match(code, /row\.publish_id/);
  assert.match(code, /status:'queued'/);
  assert.doesNotMatch(code, /idempotency_key:''/);
  const next = (name) => workflow.connections[name]?.main?.[0]?.[0]?.node;
  assert.equal(next("Manual Retry Trigger"), "Retry Input");
  assert.equal(next("Retry Input"), "Read Retry Target");
  assert.equal(next("Read Retry Target"), "Validate Safe Manual Retry");
  assert.equal(next("Validate Safe Manual Retry"), "Queue Existing Idempotency Key");
});

