# TIKTOK-000 baseline and architecture inventory

## Baseline

| Command | Result |
| --- | --- |
| `npm run lint` | passed with one existing unused-variable warning in `renderer/test/render.test.mjs:32` |
| `npm test` | passed: 55 tests |
| `npm run build` | passed |
| `cd renderer && npm test` | passed: 12 tests |

The repository initially lacked installed root dependencies, so the first lint/build attempts could not find `eslint`/`next`. After `npm ci`, every baseline command completed successfully.

## Current render path

`POST /v1/renders` in `renderer/src/server.mjs` validates an idempotency key, normalizes a legacy vocabulary payload, hashes it, renders through FFmpeg, and stores a completion record in `data/renders/manifest.json`. Replays with an unchanged payload return the cached MP4; a changed payload is rejected.

`renderer/src/render.mjs` owns the current renderer. It loads versioned template manifests, validates asset containment and safe zones, merges optional `theme.json` values, enforces fixed content limits, builds a legacy FFmpeg filter graph, and outputs a 1080×1920 H.264 MP4. The only current engine is the inline legacy renderer; no manifest has an `engine` field.

## Template inventory

| Template | Layout | Engine |
| --- | --- | --- |
| `vocabulary-pastel-v1` | default pastel card | implicit legacy-v1 |
| `vocabulary-pastel-test-v1` | pastel fixture variant | implicit legacy-v1 |
| `vocabulary-dark-reference-v1` | `dark-slide` | implicit legacy-v1 |

All manifests are loaded from `templates/*/manifest.json`. Each current package resolves `background` and `petal` assets; the renderer rejects asset paths outside the templates root.

## Public endpoints

- Renderer: `GET /healthz`, `POST /v1/renders`, `POST /v1/templates/import`, and `GET /files/:name`.
- Next.js: TikTok OAuth/connect lifecycle and publishing routes; internal TikTok creator/publish/status routes; internal vocabulary ingest/ledger/published routes; and `POST /api/templates/import`, which proxies the authenticated renderer template-import endpoint.

## Existing test coverage

`renderer/test/render.test.mjs` covers payload normalization, fallbacks, duration/batch rejection, registry/theme behavior, unknown templates, line overflow, active-template resolution, and an FFmpeg audio render. Root tests additionally cover the content scheduler, publishing idempotency, Discord ingestion, vocabulary copy/ledger, and n8n workflow contracts.

## Upgrade boundaries

Legacy payload and idempotency behavior must remain unchanged. The imported upgrade plan is in `.openclaw/`; execute its dependency graph one task at a time. The next implementation task is `TIKTOK-010` after the final baseline gate passes.
