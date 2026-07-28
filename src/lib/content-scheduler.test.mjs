import assert from "node:assert/strict";
import test from "node:test";
import {
  claimDueRows,
  decidePublish,
  nextAttempt,
  reconcileAmbiguous,
  selectDueApproved,
} from "./content-scheduler.mjs";

const now = "2030-01-02T10:00:00.000Z";
const row = (overrides) => ({
  content_id: "content-1",
  review_status: "approved",
  publish_ok: "OK",
  publish_at: "2030-01-02T09:00:00.000Z",
  status: "approved",
  publish_mode: "DRAFT",
  approval_token: "approval-1",
  ...overrides,
});

test("dry-run selects only approved due records and claims each once", () => {
  const rows = [
    row({ content_id: "due-b" }),
    row({ content_id: "due-a" }),
    row({ content_id: "future", publish_at: "2030-01-03T09:00:00Z" }),
    row({ content_id: "not-approved", review_status: "needs_review" }),
    row({ content_id: "not-ok", publish_ok: "" }),
    row({ content_id: "done", status: "published" }),
  ];
  assert.deepEqual(selectDueApproved(rows, { now }).map((item) => item.content_id), ["due-a", "due-b"]);
  const first = claimDueRows(rows, { now, owner: "execution-1" });
  const replay = claimDueRows(first.rows, { now, owner: "execution-2" });
  assert.equal(first.claims.length, 2);
  assert.equal(new Set(first.claims.map((item) => item.idempotency_key)).size, 2);
  assert.equal(replay.claims.length, 0);
  assert.deepEqual(first.claims.map((item) => decidePublish(item)), [
    { action: "hold", reason: "DRY_RUN" },
    { action: "hold", reason: "DRY_RUN" },
  ]);
});

test("expired leases are reclaimable with the same idempotency key", () => {
  const stale = row({
    status: "rendering",
    claimed_at: "2030-01-02T09:00:00Z",
    idempotency_key: "stable-key",
  });
  const result = claimDueRows([stale], { now, owner: "reconciler", leaseSeconds: 60 });
  assert.equal(result.claims[0].idempotency_key, "stable-key");
});

test("publish modes require independent feature gates and matching approval", () => {
  assert.deepEqual(decidePublish(row({ publish_mode: "DRAFT" }), { dryRun: false, approvalToken: "approval-1" }), {
    action: "draft", privacy: "SELF_ONLY",
  });
  assert.equal(decidePublish(row({ publish_mode: "SELF_ONLY" }), {
    dryRun: false, selfOnlyEnabled: false, approvalToken: "approval-1",
  }).reason, "SELF_ONLY_DISABLED");
  assert.equal(decidePublish(row({ publish_mode: "PUBLIC" }), {
    dryRun: false, publicEnabled: true, approvalToken: "wrong",
  }).reason, "APPROVAL_REQUIRED");
});

test("retry is bounded and ambiguous outcomes reconcile without a second init", () => {
  const retry = nextAttempt(row({ attempt: 0 }), { now, errorCode: "TIMEOUT" });
  assert.equal(retry.status, "queued");
  assert.equal(retry.retry_at, "2030-01-02T10:00:30.000Z");
  assert.equal(nextAttempt({ ...retry, attempt: 2 }, { now, errorCode: "TIMEOUT" }).status, "failed");
  const reconciled = reconcileAmbiguous(
    row({ idempotency_key: "stable-key", status: "failed" }),
    { status: "scheduled", publishId: "publish-1" },
  );
  assert.equal(reconciled.status, "scheduled");
  assert.equal(reconciled.publish_id, "publish-1");
});

