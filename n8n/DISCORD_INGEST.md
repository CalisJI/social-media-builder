# Discord vocabulary intake contract (CAL-52)

This design is intentionally not provisioned. An administrator must approve and
create the Discord application/webhook and Google credential before deployment.

## Message contract

Only configured channel and user IDs are accepted. IDs come from environment
configuration, never from display names. The bot accepts JSON after one command:

```text
!vocab {"word":"resilience","meaning":"khả năng phục hồi","context":"distributed systems","at":"2030-01-02T03:04:05Z"}
```

```text
!vocab-batch [{"word":"bank","meaning":"financial institution","context":"money"},{"word":"bank","meaning":"river edge","context":"geography"}]
```

`word` is required. `meaning`, `context`, and ISO-8601 `at` are optional. A batch
contains 1–50 objects. Multi-sense words are separate objects with different
meaning/context. Responses are structured as `accepted`, `rejected`, or
`duplicate`, including per-item duplicate details.

## Adapter and Sheet contract

The Discord interaction handler should verify the request signature and reject
stale timestamps before constructing `{messageId, channelId, userId, content}`.
It then calls `ingestDiscordMessage` with a store implementing `findMessage`,
`findDedupeKeys`, and atomic `appendRows`.

Use these columns in the vocabulary sheet:

`word, meaning, context, requested_at, status, publish_ok, editorial_approved_at, source, source_message_id, source_channel_id, source_user_id, source_item_index, dedupe_key, ingested_at`

Protect the editorial columns. Discord-created rows are only `draft` or
`needs_review`; the ingestion code always leaves `publish_ok` and
`editorial_approved_at` blank. Downstream publication must independently require
`publish_ok=OK` and editorial approval.

For production concurrency, do not implement uniqueness as a read followed by an
unguarded append. Use a small transactional database/idempotency ledger with
unique constraints on `source_message_id` and `dedupe_key`, or serialize writes
with a Google Apps Script lock. Store the ledger result before acknowledging the
Discord interaction. Message edits may be submitted as a new explicit command;
Discord edit/delete events never delete or publish existing rows.

## Minimum permissions and secrets

- Discord: application command/message access only in approved guild/channel;
  verify Ed25519 interaction signatures; allowlist immutable user/channel IDs.
- Google: a service account shared only as Editor on the target spreadsheet
  (not Drive-wide access). Protect approval columns/ranges from that account.
- Runtime: `DISCORD_PUBLIC_KEY`, `DISCORD_ALLOWED_CHANNEL_IDS`,
  `DISCORD_ALLOWED_USER_IDS`, `GOOGLE_SHEET_ID`, and a secret-manager reference
  to the service-account credential. Never log request authorization headers,
  bot tokens, private keys, or full message bodies.
- Apply a per-user and per-channel rate limit, a 50-entry/message cap, request
  size limit, signature timestamp window, and bounded retries with jitter for
  429/5xx/timeouts. Reject other 4xx errors and send failures to a dead-letter
  queue with message ID and error class only.

## Dry run and rollback

`npm run test:n8n` uses `MemorySheetStore` and proves that replaying one Discord
message produces exactly one row. It also covers single, batch, cross-message
duplicate, malformed, multi-sense, unauthorized, and approval-bypass cases.

Rollout: deploy with writes disabled, validate signature/allowlist metrics, then
enable writes to a staging sheet. Rollback by disabling the interaction route or
revoking the service-account share. Preserve the idempotency ledger and existing
rows for audit; never mass-delete on rollback. Rotate the Discord key and Google
credential if exposure is suspected.
