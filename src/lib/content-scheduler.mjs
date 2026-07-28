import { createHash, randomUUID } from "node:crypto";

export const TERMINAL_STATUSES = new Set(["published", "failed"]);
export const ACTIVE_STATUSES = new Set(["queued", "rendering", "scheduled"]);

function iso(value, field) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.valueOf())) throw new Error(`${field} must be an ISO date`);
  return date.toISOString();
}

function stableKey(row) {
  return createHash("sha256")
    .update(`${row.content_id}\u001f${row.publish_at}`)
    .digest("hex")
    .slice(0, 32);
}

export function selectDueApproved(rows, {
  now = new Date(),
  limit = 20,
  leaseSeconds = 900,
} = {}) {
  const nowMs = new Date(now).valueOf();
  return rows
    .filter((row) => row.review_status === "approved" && row.publish_ok === "OK")
    .filter((row) => new Date(row.publish_at).valueOf() <= nowMs)
    .filter((row) => {
      if (!ACTIVE_STATUSES.has(row.status)) return !TERMINAL_STATUSES.has(row.status);
      if (!row.claimed_at) return false;
      return nowMs - new Date(row.claimed_at).valueOf() > leaseSeconds * 1000;
    })
    .sort((a, b) => new Date(a.publish_at) - new Date(b.publish_at)
      || String(a.content_id).localeCompare(String(b.content_id)))
    .slice(0, limit);
}

export function claimDueRows(rows, options = {}) {
  const claimedAt = iso(options.now ?? new Date(), "now");
  const owner = options.owner || randomUUID();
  const due = selectDueApproved(rows, options);
  const dueIds = new Set(due.map((row) => row.content_id));
  const claims = [];
  const nextRows = rows.map((row) => {
    if (!dueIds.has(row.content_id)) return row;
    const claim = {
      ...row,
      status: "queued",
      claimed_at: claimedAt,
      claim_owner: owner,
      idempotency_key: row.idempotency_key || stableKey(row),
      error_code: "",
      updated_at: claimedAt,
    };
    claims.push(claim);
    return claim;
  });
  return { rows: nextRows, claims };
}

export function decidePublish(row, {
  dryRun = true,
  selfOnlyEnabled = false,
  publicEnabled = false,
  approvalToken = "",
} = {}) {
  if (dryRun) return { action: "hold", reason: "DRY_RUN" };
  if (!approvalToken || approvalToken !== row.approval_token) {
    return { action: "hold", reason: "APPROVAL_REQUIRED" };
  }
  if (row.publish_mode === "SELF_ONLY") {
    return selfOnlyEnabled
      ? { action: "schedule", privacy: "SELF_ONLY" }
      : { action: "hold", reason: "SELF_ONLY_DISABLED" };
  }
  if (row.publish_mode === "PUBLIC") {
    return publicEnabled
      ? { action: "schedule", privacy: "PUBLIC_TO_EVERYONE" }
      : { action: "hold", reason: "PUBLIC_DISABLED" };
  }
  return { action: "draft", privacy: "SELF_ONLY" };
}

export function nextAttempt(row, {
  now = new Date(),
  maxAttempts = 3,
  baseDelaySeconds = 30,
  retryable = true,
  errorCode = "UNKNOWN",
} = {}) {
  const attempt = Number(row.attempt || 0) + 1;
  if (!retryable || attempt >= maxAttempts) {
    return { ...row, status: "failed", attempt, error_code: errorCode, updated_at: iso(now, "now") };
  }
  return {
    ...row,
    status: "queued",
    attempt,
    error_code: errorCode,
    retry_at: new Date(new Date(now).valueOf() + baseDelaySeconds * (2 ** (attempt - 1)) * 1000).toISOString(),
    updated_at: iso(now, "now"),
  };
}

export function reconcileAmbiguous(row, remote) {
  if (!row.idempotency_key) throw new Error("idempotency_key is required");
  if (!remote) return { ...row, status: "failed", error_code: "RECONCILE_REQUIRED" };
  if (remote.status === "published") {
    return { ...row, status: "published", publish_id: remote.publishId, published_at: remote.publishedAt };
  }
  if (remote.status === "scheduled") {
    return { ...row, status: "scheduled", publish_id: remote.publishId };
  }
  return { ...row, status: "queued", error_code: "" };
}

