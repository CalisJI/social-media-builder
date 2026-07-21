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
```

Generate the session secret with `openssl rand -hex 32`. The real `.env` is ignored by Git.

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
- Record the current TikTok review/audit state and test-account label without
  client keys, client secrets, authorization codes, or tokens.
