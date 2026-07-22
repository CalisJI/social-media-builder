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
TIKTOK_SESSION_FILE=/app/data/tiktok-session.enc
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
    `mode` (`draft` or `publish`), and `privacy`.
  - `POST /api/internal/tiktok/status` with `publishId`.
  Both endpoints require `Authorization: Bearer <N8N_SERVICE_TOKEN>`. Media URLs
  must use HTTPS and an exact host listed in `N8N_MEDIA_ALLOWED_HOSTS`.
- Record the current TikTok review/audit state and test-account label without
  client keys, client secrets, authorization codes, or tokens.
