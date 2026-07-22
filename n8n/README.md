# CAL-35 n8n workflow

`workflows/cal-35-vocabulary-publisher.json` is the version-controlled import
for the Social-Workspace workflow. It remains inactive and starts only from a
manual trigger. The publish branch is additionally locked by both an explicit
input approval and `N8N_CAL3_PUBLISH_ENABLED=true`.

## Why the flow is structured this way

- Validation fans a batch of 1–50 entries into stable jobs. The deterministic
  `batch_id-index` job ID is also the renderer idempotency key and R2 object key.
- Rendering happens before the scheduled wait so a slow render cannot miss the
  desired publish time. The wait resumes each item at its own `publish_at`.
- R2 owns the TikTok-readable HTTPS media copy. TikTok credentials never enter
  n8n; n8n calls the backend with a Header Auth credential.
- Transport, timeout, 408, 429 and 5xx failures are retryable. Validation, 4xx
  contract failures and idempotency conflicts are non-retryable.

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

## Common failures and rollback

- `NON_RETRYABLE`: fix the payload, HTTPS host/prefix, credential binding or
  reused idempotency key; blind retries will not help.
- `RETRYABLE`: inspect renderer/backend health and allow the bounded node retry.
- A run interrupted after the backend call is ambiguous. Check backend/TikTok
  status using the recorded publish ID before retrying.
- Emergency stop: deactivate the workflow and set
  `N8N_CAL3_PUBLISH_ENABLED=false`. This prevents new publish calls without
  deleting execution evidence or rendered media.

Run `node --test n8n/test/workflow-contract.test.mjs` before importing changes.
