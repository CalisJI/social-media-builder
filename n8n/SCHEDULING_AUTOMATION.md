# CAL-50 scheduling automation

The scheduler reads the existing `Content` sheet. A row is eligible only when
`review_status=approved`, `publish_ok=OK`, `publish_at <= now`, and it is not
terminal. The claim writes `queued`, `claimed_at`, `claim_owner`, and a stable
`idempotency_key` before rendering. This is a compare-and-set operation in the
production adapter: re-read the row after updating it and continue only when
`claim_owner` still matches the current execution.

The exported workflow implements that read-back explicitly with `Read Back
Claims` and `Continue Only Owned Claims`. A losing execution produces no output
and therefore cannot reach renderer, R2, or publisher.

## Sequence and rationale

```mermaid
sequenceDiagram
  participant Cron as n8n schedule
  participant Sheet as Content source
  participant Render as Renderer
  participant R2
  participant API as Publisher backend
  Cron->>Sheet: read approved + due rows
  Cron->>Sheet: claim queued (execution ID + stable key)
  Note over Cron,Sheet: Claim first prevents two executions processing one row
  Cron->>Render: render(idempotency_key)
  Render-->>Cron: MP4/render_id
  Cron->>R2: put deterministic object key
  Note over Cron,R2: Stable keys make retries overwrite, not duplicate
  Cron->>Cron: QA gate + mode/feature/approval gate
  alt dry-run or gate closed
    Cron->>Sheet: keep Draft/held; never call publisher
  else gate open
    Cron->>API: schedule with Idempotency-Key
    API-->>Cron: publish_id/status
    Cron->>Sheet: scheduled/published
  end
  Cron->>API: reconcile ambiguous timeout by idempotency key
  Note over Cron,API: Reconcile before retry prevents a second TikTok init
```

Lifecycle states are `queued`, `rendering`, `scheduled`, `published`, and
`failed`. These columns plus `attempt`, `retry_at`, `error_code`, `render_id`,
and `publish_id` are the dashboard/log. A manual retry clears a retryable
`error_code`, sets `queued`, and preserves the idempotency key. Non-retryable
validation and approval failures require editing/re-approval first.

## Safety gates

- `SCHEDULER_DRY_RUN=true` is the default and suppresses every publisher call.
- `SELF_ONLY_ENABLED=true` enables only a separately approved SELF_ONLY test.
- `PUBLIC_PUBLISH_ENABLED=true` is independent and must remain false until
  production approval.
- Every non-dry run also requires a per-row `approval_token` matching the
  execution input. Environment gates alone are insufficient.
- `DRAFT` prepares media and creates a draft only; it never becomes public.

No SELF_ONLY test is executed by repository tests. It requires explicit
approval, temporary gate enablement, and one chosen content ID.

## Dry-run evidence

Run `npm test`. `content-scheduler.test.mjs` supplies six mixed records and
proves only the two approved due rows are claimed, a replay claims zero rows,
stable keys survive stale-lease recovery, and dry-run returns `hold` without a
publish action. All tests are local and call neither R2 nor TikTok.

## Operations and rollback

Enable: import the workflow inactive, bind least-privilege Sheet/R2/backend
credentials, keep all publish gates false, run the dry-run fixture, then
activate the schedule. Enable SELF_ONLY only for the separately approved row.

Emergency pause: deactivate the n8n workflow first, set
`SELF_ONLY_ENABLED=false` and `PUBLIC_PUBLISH_ENABLED=false`, then allow current
executions to stop at the gate. Do not delete claims or idempotency records.

Rollback: restore the prior inactive workflow, leave gates false, and reconcile
every `rendering`/`scheduled` row by idempotency key. Reset only confirmed
not-created jobs to `queued`; mark validation failures `failed`. Never blindly
retry an ambiguous TikTok timeout.
