import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const active = new Map();
let writes = Promise.resolve();

export class IdempotencyError extends Error {
  constructor(message, status, code, details) {
    super(message);
    this.name = "IdempotencyError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function validateIdempotencyKey(value) {
  if (typeof value !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]{7,127}$/.test(value)) {
    throw new IdempotencyError(
      "idempotencyKey must be 8-128 URL-safe characters",
      400,
      "invalid_idempotency_key",
    );
  }
  return value;
}

export function idempotencyHash(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

async function load(file) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return {};
    throw error;
  }
}

function mutate(file, operation) {
  const result = writes.then(async () => {
    const records = await load(file);
    const value = await operation(records);
    await mkdir(dirname(file), { recursive: true, mode: 0o700 });
    const temporary = `${file}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(temporary, JSON.stringify(records, null, 2), { mode: 0o600 });
    await rename(temporary, file);
    return value;
  });
  writes = result.then(() => undefined, () => undefined);
  return result;
}

function replay(record, hash) {
  if (record.hash !== hash) {
    throw new IdempotencyError(
      "idempotency key was already used with a different request",
      409,
      "idempotency_conflict",
    );
  }
  if (record.status === "completed") {
    return { state: "completed", cached: true, result: record.result };
  }
  throw new IdempotencyError(
    "publish outcome is already in flight or requires reconciliation",
    409,
    "idempotency_in_progress",
    { status: record.status, updatedAt: record.updatedAt },
  );
}

export async function findIdempotentPublish({ file, key, request }) {
  validateIdempotencyKey(key);
  const hash = idempotencyHash(request);
  const running = active.get(key);
  if (running) {
    if (running.hash !== hash) return replay({ hash: running.hash, status: "in_progress" }, hash);
    return { ...(await running.promise), shared: true };
  }
  const record = (await load(file))[key];
  return record ? replay(record, hash) : null;
}

export async function runIdempotentPublish({ file, key, request, operation, now = () => new Date().toISOString() }) {
  validateIdempotencyKey(key);
  const hash = idempotencyHash(request);
  const running = active.get(key);
  if (running) {
    if (running.hash !== hash) return replay({ hash: running.hash, status: "in_progress" }, hash);
    return { ...(await running.promise), shared: true };
  }

  const promise = (async () => {
    const claimed = await mutate(file, (records) => {
      if (records[key]) return { replay: replay(records[key], hash) };
      records[key] = { hash, status: "in_progress", updatedAt: now() };
      return { claimed: true };
    });
    if (claimed.replay) return claimed.replay;

    try {
      const result = await operation();
      await mutate(file, (records) => {
        records[key] = { hash, status: "completed", result, updatedAt: now() };
      });
      return { state: "completed", cached: false, result };
    } catch (error) {
      await mutate(file, (records) => {
        records[key] = {
          hash,
          status: "reconcile_required",
          error: error instanceof Error ? error.message : "unknown error",
          updatedAt: now(),
        };
      });
      throw error;
    }
  })().finally(() => active.delete(key));

  active.set(key, { hash, promise });
  return promise;
}
