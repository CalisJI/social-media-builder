import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { runIdempotentPublish } from "../../src/lib/publish-idempotency.mjs";

async function fixture(run) {
  const directory = await mkdtemp(path.join(tmpdir(), "cal37-idempotency-"));
  try { await run(path.join(directory, "publish.json")); }
  finally { await rm(directory, { recursive: true, force: true }); }
}

const request = { videoUrl: "https://media.invalid/cal-3/test.mp4", caption: "test", mode: "draft", privacy: "SELF_ONLY" };

test("concurrent and replayed requests call publish init exactly once", () => fixture(async (file) => {
  let calls = 0;
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const operation = async () => { calls += 1; await gate; return { publishId: "pub-1", mode: "draft" }; };
  const first = runIdempotentPublish({ file, key: "replay-key-001", request, operation });
  const concurrent = runIdempotentPublish({ file, key: "replay-key-001", request, operation });
  release();
  const [a, b] = await Promise.all([first, concurrent]);
  const replay = await runIdempotentPublish({ file, key: "replay-key-001", request, operation });
  assert.equal(calls, 1);
  assert.equal(a.result.publishId, "pub-1");
  assert.equal(b.shared, true);
  assert.equal(replay.cached, true);
  const records = JSON.parse(await readFile(file, "utf8"));
  assert.equal(records["replay-key-001"].status, "completed");
}));

test("same key with a different payload is rejected", () => fixture(async (file) => {
  await runIdempotentPublish({ file, key: "conflict-key-001", request, operation: async () => ({ publishId: "pub-1" }) });
  await assert.rejects(
    runIdempotentPublish({ file, key: "conflict-key-001", request: { ...request, caption: "changed" }, operation: async () => ({ publishId: "pub-2" }) }),
    (error) => error.status === 409 && error.code === "idempotency_conflict",
  );
}));

test("ambiguous failure is persisted and cannot initialize twice", () => fixture(async (file) => {
  let calls = 0;
  const operation = async () => { calls += 1; throw new Error("connection reset after init"); };
  await assert.rejects(runIdempotentPublish({ file, key: "ambiguous-key-001", request, operation }));
  await assert.rejects(
    runIdempotentPublish({ file, key: "ambiguous-key-001", request, operation }),
    (error) => error.status === 409 && error.code === "idempotency_in_progress",
  );
  assert.equal(calls, 1);
  const records = JSON.parse(await readFile(file, "utf8"));
  assert.equal(records["ambiguous-key-001"].status, "reconcile_required");
}));
