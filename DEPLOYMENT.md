# Deployment configuration

Production domain: `https://tiktok-agent-legal.calis.chillpickle.org`

## Add TikTok credentials

Create a file named `.env` beside `compose.yaml` on the deployment host. Do not edit or commit `.env.example` with real values.

```dotenv
APP_PORT=3000
TIKTOK_CLIENT_KEY=paste_client_key_here
TIKTOK_CLIENT_SECRET=paste_client_secret_here
TIKTOK_REDIRECT_URI=https://tiktok-agent-legal.calis.chillpickle.org/api/tiktok/callback
SESSION_SECRET=paste_random_64_hex_characters_here
```

Generate the session secret with `openssl rand -hex 32`. The real `.env` is ignored by Git.

Start or update the app with `docker compose up -d --build`. Compose refuses to start when any required secret is missing.

## TikTok Developer Portal values

- Website URL: `https://tiktok-agent-legal.calis.chillpickle.org`
- Redirect URI: `https://tiktok-agent-legal.calis.chillpickle.org/api/tiktok/callback`
- Privacy Policy: `https://tiktok-agent-legal.calis.chillpickle.org/privacy/`
- Terms of Service: `https://tiktok-agent-legal.calis.chillpickle.org/terms/`

The redirect URI must match character-for-character in TikTok and `.env`.
