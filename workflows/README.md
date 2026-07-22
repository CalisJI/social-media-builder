# Social-Workspace workflow

This secret-free CAL-35 export accepts 1–50 jobs and runs validate → render →
R2 `cal-3/pending/` → scheduled wait → backend TikTok draft. It is intentionally
inactive and has no public-publish branch.

## Meaning and why

- A caller idempotency key derives stable render and object keys, preventing
  duplicate artifacts on retries.
- Network steps use finite timeouts, at most three attempts, and bounded
  backoff. 408/425/429/5xx are retryable; bad input and other 4xx are not.
- R2 precedes the scheduled wait, so resumed executions use durable media.
- The backend request hard-codes `draft` and `SELF_ONLY`; public posting stays a
  separate, manually reviewed future operation.

## Import

Import `social-workspace.json` into n8n 1.106.x, bind the placeholder R2 and
backend header-auth credentials in the UI, and configure `RENDERER_BASE_URL`,
`R2_BUCKET_NAME`, `R2_PUBLIC_BASE_URL`, and `SOCIAL_BACKEND_URL`. Never paste
tokens into an export. Keep the workflow inactive while testing.

## Common failures

- `NON_RETRYABLE validation_error`: batch count, key, content, or date is bad.
- Render 409: an idempotency key was reused with different content.
- R2 failure: credential placeholder was not rebound or bucket/prefix access is
  missing.
- Backend 400: verify HTTPS host/prefix, MP4 content type, and content length.
- Backend 401/409: rebind header auth or reconnect the TikTok owner in the UI.

Run `npm run test:workflow` after editing the export.
