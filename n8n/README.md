# CAL-35 n8n workflow

`workflows/cal-35-vocabulary-publisher.json` is the version-controlled import
for the Social-Workspace workflow. It remains inactive and starts only from a
manual trigger. The publish branch is additionally locked by both an explicit
input approval and `N8N_CAL3_PUBLISH_ENABLED=true`.

For Discord vocabulary intake, import
`workflows/cal-52-discord-vocabulary-ingest.json` inactive, bind `Discord Bot
Account` and `Google Service Account account`, then run its manual test path.
After verification, activate only this workflow. Its schedule polls the approved
Discord channel every minute, normalizes `!vocab` / `!vocab-batch`, deduplicates
against the `Content` sheet, and appends at most one `needs_review` row per run
with blank `publish_ok`.

## Why the flow is structured this way

- Validation fans a batch of 1–50 entries into stable jobs. The deterministic
  `batch_id-index` job ID is also the renderer idempotency key and R2 object key.
- Rendering happens before the scheduled wait so a slow render cannot miss the
  desired publish time. The wait resumes each item at its own `publish_at`.
- R2 owns the TikTok-readable HTTPS media copy. TikTok credentials never enter
  n8n; n8n calls the backend with a Header Auth credential.
- Transport, timeout, 408, 425, 429 and 5xx failures are retryable. Validation, 4xx
  contract failures and idempotency conflicts are non-retryable.
- Retry is an explicit classified loop: at most three total attempts with 1s
  then 2s backoff. The HTTP nodes do not use blind `retryOnFail`; this ensures a
  permanent 4xx fails once while 5xx responses still enter the retry branch.

## Import and configure

1. Import the JSON in n8n Social-Workspace and leave it inactive.
2. Configure environment variables: `RENDERER_BASE_URL`, `CAL3_R2_BUCKET`,
   `CAL3_MEDIA_BASE_URL`, `SOCIAL_PUBLISHER_BASE_URL`. Do not put secrets in
   these values or in the exported JSON.
3. Bind `CAL-3 R2 (configure in n8n)` to the existing least-privilege S3/R2
   credential and `Social Publisher Backend (configure in n8n)` to Header Auth.
4. Run manually with `approved:false`. Confirm render, upload, HTTPS media URL,
   scheduled resume, and final `WAITING_FOR_APPROVAL` output.
5. A separately authorized test may set `approved:true` and temporarily set
   `N8N_CAL3_PUBLISH_ENABLED=true`. Disable it immediately after the run.

The workflow queries the backend's authenticated creator-info endpoint once per
execution. An entry-level `channel_handle` remains an explicit manual override.
When it is blank, the workflow uses TikTok's verified `username` field and
generates the default CTA from that handle. If TikTok does not return a valid
username, validation stops instead of guessing from the display name. Creator
info is cached by the backend for 15 minutes, so this adds no per-video polling.

## Common failures and rollback

- `NON_RETRYABLE`: fix the payload, HTTPS host/prefix, credential binding or
  reused idempotency key; blind retries will not help.
- `RETRYABLE`: inspect renderer/backend health and allow the bounded node retry.
- A run interrupted after the backend call is ambiguous. Check backend/TikTok
  status using the recorded publish ID before retrying.
- Emergency stop: deactivate the workflow and set
  `N8N_CAL3_PUBLISH_ENABLED=false`. This prevents new publish calls without
  deleting execution evidence or rendered media.

Run `npm run test:n8n` before importing changes. The suite includes local fault
injection for renderer 5xx/timeout, temporary storage failure, retry
exhaustion, concurrent/replayed publish idempotency, and the Discord ingest
workflow contract; it does not call real services.
