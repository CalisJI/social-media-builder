# Deployment configuration

Production domain: `https://tiktok-agent-calis-legal.chillpickle.org`

## Add TikTok credentials

Create a file named `.env` beside `compose.yaml` on the deployment host. Do not edit or commit `.env.example` with real values.

```dotenv
APP_PORT=3000
TIKTOK_ENV=sandbox
PROD_TIKTOK_CLIENT_KEY=paste_production_client_key_here
PROD_TIKTOK_CLIENT_SECRET=paste_production_client_secret_here
SANDBOX_TIKTOK_CLIENT_KEY=paste_sandbox_client_key_here
SANDBOX_TIKTOK_CLIENT_SECRET=paste_sandbox_client_secret_here
TIKTOK_REDIRECT_URI=https://tiktok-agent-calis-legal.chillpickle.org/api/tiktok/callback
TIKTOK_ALLOW_PUBLIC_POSTS=false
SESSION_SECRET=paste_random_64_hex_characters_here
N8N_SERVICE_TOKEN=paste_a_different_random_64_hex_characters_here
N8N_MEDIA_ALLOWED_HOSTS=tiktok-media.calis.chillpickle.org
N8N_MEDIA_ALLOWED_PREFIXES=/cal-3/
N8N_MEDIA_MAX_BYTES=524288000
TIKTOK_SESSION_FILE=/app/data/tiktok-session.enc
PUBLISH_IDEMPOTENCY_FILE=/app/data/publish-idempotency.json
```

Generate `SESSION_SECRET` and `N8N_SERVICE_TOKEN` separately with
`openssl rand -hex 32`. Never reuse either value or paste them into n8n workflow
exports, issue comments, or source control. The real `.env` is ignored by Git.

Use `TIKTOK_ENV=sandbox` while testing and recording the review video. Change only
this selector to `production` after approval. Docker requires a normal UTF-8
dotenv file; do not save `.env` using Vim encryption. Protect it with
`chmod 600 .env` instead.

Start or update the app with `docker compose up -d --build`. Compose refuses to start when any required secret is missing.

## TikTok Developer Portal values

- Website URL: `https://tiktok-agent-calis-legal.chillpickle.org`
- Redirect URI: `https://tiktok-agent-calis-legal.chillpickle.org/api/tiktok/callback`
- Privacy Policy: `https://tiktok-agent-calis-legal.chillpickle.org/privacy/`
- Terms of Service: `https://tiktok-agent-calis-legal.chillpickle.org/terms/`

The redirect URI must match character-for-character in TikTok and `.env`.

## OAuth ownership and review checklist

- The application backend is the only OAuth owner. Do not create a TikTok OAuth2
  credential in n8n or add `/rest/oauth2-credential/callback` as a redirect URI.
- Required publishing scopes include `video.upload` and `video.publish`. Direct
  Post remains limited to `SELF_ONLY` until TikTok approves the app for public
  visibility; always use the privacy options returned by Creator Info. Keep
  `TIKTOK_ALLOW_PUBLIC_POSTS=false` until that approval is confirmed.
- The encrypted HTTP-only session stores both access and refresh tokens. The
  backend refreshes an expiring access token without exposing either token to
  the browser or workflow exports.
- The backend also stores the OAuth owner's encrypted session in the dedicated
  Docker volume at `TIKTOK_SESSION_FILE`. n8n authenticates only with
  `N8N_SERVICE_TOKEN` and can call:
  - `POST /api/internal/tiktok/publish` with `videoUrl`, optional `caption`,
    `mode` (`draft` or `publish`), `privacy`, and a stable `idempotencyKey`.
  - `POST /api/internal/tiktok/status` with `publishId`.
  Both endpoints require `Authorization: Bearer <N8N_SERVICE_TOKEN>`. Media URLs
  must use HTTPS and an exact host listed in `N8N_MEDIA_ALLOWED_HOSTS`.

## CAL-40 reliability and rollback guide

### Idempotency contract

- n8n derives one stable `job_id` from `batch_id` plus the item index. The same
  value is the renderer `Idempotency-Key`, R2 object name, and backend
  `idempotencyKey`. Re-running a batch therefore addresses the same render,
  object, and publish operation instead of allocating new ones.
- The backend writes an `in_progress` claim to `PUBLISH_IDEMPOTENCY_FILE` before
  TikTok init. Concurrent requests with the same key and payload share the
  in-flight Promise; completed requests return the stored `publishId` with
  `cached:true`. Reusing a key with a different payload returns HTTP 409.
- If the connection fails after init may have reached TikTok, the record becomes
  `reconcile_required`. Replays return 409 and never call init again. Check the
  execution log and TikTok status before any manual recovery; do not delete the
  record merely to force a retry.
- Keep the idempotency file on the same persistent, access-restricted volume as
  the encrypted TikTok session. Back it up before deploys and never expose or
  edit it through a public endpoint.

### Retry policy and trace evidence

- Renderer, R2, and backend publish use explicit workflow loops. Transport
  failures and HTTP 408, 425, 429, and 5xx retry at most three total attempts,
  with 1s then 2s backoff. Other 4xx responses fail immediately.
- HTTP nodes keep `neverError:true` only so the classifier can inspect the real
  status. Built-in `retryOnFail` is intentionally disabled; otherwise either a
  5xx can bypass retry or a permanent 4xx can be retried blindly.
- n8n saves successful and failed execution data. Classifier output records
  `attempt`, `last_http_status`, final component status, stable `job_id`, and
  cached publish state. Backend logs record the key, state, cached/shared flags,
  but never credentials or request media content.

### Common failures

- `NON_RETRYABLE`: fix payload, media allow-list, credential binding, or an
  idempotency conflict. Automatic retries will not help.
- `RETRY_EXHAUSTED`: the dependency stayed unavailable for all three attempts.
  Preserve the execution, restore the dependency, then replay the same batch
  and key.
- `idempotency_in_progress`: an operation is active or its outcome is ambiguous.
  Reconcile the stored publish ID/status; never generate a replacement key to
  bypass this safety stop.
- R2 retry always overwrites `cal-3/pending/<job_id>.mp4`. A different object
  name indicates an upstream job-ID bug and publishing must remain disabled.

### Safe rollback

1. Set `N8N_CAL3_PUBLISH_ENABLED=false` and deactivate the workflow to stop new
   publish calls while preserving execution evidence.
2. Roll back the app/workflow image, but retain the persistent session and
   idempotency volume. Deleting the idempotency file can permit duplicate init.
3. For an R2 incident, revoke the n8n write credential or disable its workflow
   branch; do not delete pending objects until jobs are reconciled.
4. Re-enable only after `npm run test:n8n`, renderer tests, lint, and production
   build pass with no real TikTok or public-media calls.

## CAL-3 media storage policy

- Store rendered outputs under `cal-3/pending/` while render/publish is in
  progress. The internal publish API rejects objects outside the dedicated
  `cal-3/` namespace configured by `N8N_MEDIA_ALLOWED_PREFIXES`.
- Upload only MP4 files and set object metadata `Content-Type: video/mp4`.
  Before TikTok is called, the backend performs a bounded 10-second `HEAD`
  request and rejects redirects, non-2xx responses, missing/invalid lengths,
  non-MP4 content, and objects larger than `N8N_MEDIA_MAX_BYTES` (500 MiB by
  default).
- The public custom domain intentionally provides stable, non-expiring object
  URLs. Keep R2 write/list/delete credentials private in n8n; the public domain
  grants read access only and neither exposes nor requires an access key.
- After TikTok reports `PUBLISH_COMPLETE`, copy the object to
  `cal-3/published/<publish-id>.mp4`, verify the copy's size/content type and
  public HTTPS response, then delete the corresponding `pending/` object. Do not
  move it on an init response or an intermediate processing state.
- Owner-approved retention is 15 days after successful publish. In Cloudflare
  R2, create an object expiration lifecycle rule scoped only to prefix
  `cal-3/published/`, with age 15 days. R2 calculates age from object creation,
  so the post-success copy into `published/` starts the retention clock. Never
  scope this rule to `cal-3/pending/`: failed or stalled jobs must remain
  available for investigation and explicit cleanup.
- TLS/content verification after each policy or domain change:

  ```bash
  curl --proto '=https' --tlsv1.2 --fail --silent --show-error \
    --head https://tiktok-media.calis.chillpickle.org/cal-3/<object>.mp4
  ```

  Expect HTTP 200, `Content-Type: video/mp4`, a positive `Content-Length`, and
  no redirect. Test a byte range separately with `curl -r 0-0`; expect 206.
- Rollback: disable the R2 custom domain to stop all public reads immediately;
  disable/delete the lifecycle rule to stop future expiry; revoke the n8n R2
  token to stop writes; then remove the host from `N8N_MEDIA_ALLOWED_HOSTS` and
  redeploy the backend. Existing objects remain recoverable unless a lifecycle
  deletion has already executed.
- Record the current TikTok review/audit state and test-account label without
  client keys, client secrets, authorization codes, or tokens.
