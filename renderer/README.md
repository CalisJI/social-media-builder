# Vocabulary renderer

Self-hosted synchronous job API that renders one vocabulary entry to a silent
H.264 MP4 (1080x1920, 30 fps, 8-10.5 seconds). It uses FFmpeg directly and has
no npm runtime dependencies.

## Run with Docker

From the repository root:

```sh
docker compose up --build renderer
curl http://localhost:3100/healthz
curl -f -X POST http://localhost:3100/v1/renders \
  -H 'content-type: application/json' \
  -H 'idempotency-key: vocab-e2e-resilient-001' \
  --data-binary @payload-one-word-e2e.json
```

The response contains a stable `url`. Repeating the exact request returns the
same file with `cached: true`. Reusing the key with different normalized content
returns HTTP 409. The manifest and completed MP4 are persisted in the
`renderer-output` volume; files are atomically renamed only after FFmpeg exits
successfully.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `RENDERER_PORT` | `3100` | HTTP port |
| `RENDER_OUTPUT_DIR` | `./data/renders` | Persistent output and manifest |
| `RENDER_PUBLIC_BASE_URL` | `http://localhost:3100/files` | URL prefix returned to callers |
| `RENDER_TIMEOUT_MS` | `120000` | FFmpeg hard timeout |
| `HTTP_REQUEST_TIMEOUT_MS` | `130000` | HTTP request timeout (keep above render timeout) |
| `RENDER_MAX_BODY_BYTES` | `65536` | Request size limit |
| `RENDER_PRESET` | `medium` | x264 preset |
| `RENDER_CRF` | `20` | x264 quality |
| `FFMPEG_PATH` | `ffmpeg` | FFmpeg executable |
| `RENDER_FONT_FILE` / `RENDER_BOLD_FONT_FILE` | DejaVu paths | Unicode font files |

The service logs structured JSON errors to stderr. Audio fields are accepted in
the upstream payload but intentionally ignored for the first silent E2E release.

## Verify locally without Docker

Requires Node.js 20+, FFmpeg with `libx264`, and DejaVu fonts:

```sh
cd renderer
npm test
node src/server.mjs
```

After rendering, verify the artifact:

```sh
ffprobe -v error -select_streams v:0 \
  -show_entries stream=codec_name,width,height,r_frame_rate,pix_fmt \
  -show_entries format=duration -of json data/renders/vocab-e2e-resilient-001.mp4
```
