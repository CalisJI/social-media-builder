import assert from "node:assert/strict";
import test from "node:test";

const retryable = (status) => status === 0 || [408, 425, 429].includes(status) || status >= 500;

async function withRetry(operation, { maxAttempts = 3, sleep = async () => {} } = {}) {
  const trace = [];
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const result = await operation(attempt);
    trace.push({ attempt, status: result.status });
    if (result.status >= 200 && result.status < 300) return { result, trace };
    if (!retryable(result.status)) throw Object.assign(new Error("NON_RETRYABLE"), { trace });
    if (attempt === maxAttempts) throw Object.assign(new Error("RETRY_EXHAUSTED"), { trace });
    await sleep(2 ** (attempt - 1));
  }
}

test("renderer 5xx and timeout recover with bounded exponential backoff", async () => {
  for (const failures of [[500, 502], [0, 504]]) {
    const waits = [];
    const videos = new Map();
    const jobId = "reliability-01";
    const { trace } = await withRetry(
      async (attempt) => {
        const status = failures[attempt - 1] ?? 201;
        if (status === 201) videos.set(jobId, Buffer.from("video"));
        return { status };
      },
      { sleep: async (seconds) => waits.push(seconds) },
    );
    assert.deepEqual(trace.map((entry) => entry.status), [...failures, 201]);
    assert.deepEqual(waits, [1, 2]);
    assert.deepEqual([...videos.keys()], [jobId]);
  }
});

test("replaying a batch derives the same unique job IDs", () => {
  const derive = (batchId, count) => Array.from(
    { length: count },
    (_, index) => `${batchId}-${String(index + 1).padStart(2, "0")}`,
  );
  const first = derive("stable-batch-001", 3);
  const replay = derive("stable-batch-001", 3);
  assert.deepEqual(replay, first);
  assert.equal(new Set([...first, ...replay]).size, 3);
});

test("temporary R2 failure retries the same object key without duplicates", async () => {
  const objects = new Map();
  let calls = 0;
  const key = "cal-3/pending/reliability-01.mp4";
  await withRetry(async () => {
    calls += 1;
    if (calls < 3) return { status: 503 };
    objects.set(key, Buffer.from("video"));
    return { status: 200 };
  });
  assert.equal(calls, 3);
  assert.deepEqual([...objects.keys()], [key]);
});

test("permanent 4xx fails once and never loops", async () => {
  let calls = 0;
  await assert.rejects(
    withRetry(async () => { calls += 1; return { status: 400 }; }),
    (error) => error.message === "NON_RETRYABLE" && error.trace.length === 1,
  );
  assert.equal(calls, 1);
});

test("retry exhaustion stops after exactly three attempts", async () => {
  let calls = 0;
  await assert.rejects(
    withRetry(async () => { calls += 1; return { status: 500 }; }),
    (error) => error.message === "RETRY_EXHAUSTED" && error.trace.length === 3,
  );
  assert.equal(calls, 3);
});
