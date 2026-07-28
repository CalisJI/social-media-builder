# Discord vocabulary intake contract (CAL-52)

The Discord-to-Sheet workflow is captured in
`workflows/cal-52-discord-vocabulary-ingest.json`. It is exported inactive for
safe import. In production it runs every minute, reads recent messages through
the existing Discord bot credential, and writes accepted rows through the
existing Google service-account credential.

## Message contract

Only human-authored commands from Discord channel `1529722358309584987` are
accepted. The server and channel use immutable IDs rather than display names.
The bot accepts JSON after one command:

```text
!vocab {"word":"resilience","meaning":"khả năng phục hồi","context":"distributed systems","at":"2030-01-02T03:04:05Z"}
```

```text
!vocab-batch [{"word":"bank","meaning":"financial institution","context":"money"},{"word":"bank","meaning":"river edge","context":"geography"}]
```

`word` is required. `meaning`, `context`, `part_of_speech`, `ipa`,
`example_en`, and `example_vi` are optional. A batch contains 1–50 objects.
Multi-sense words are separate objects with different meaning/context.

## Adapter and Sheet contract

The Discord interaction handler should verify the request signature and reject
stale timestamps before constructing `{messageId, channelId, userId, content}`.
It then calls `ingestDiscordMessage` with a store implementing `findMessage`,
`findDedupeKeys`, and atomic `appendRows`.

Rows are appended to the existing `Content` tab in spreadsheet
`1bfzprj4G7VrnPZmC3qMXwF5hL8qLHNYbmr8z1lAoSU0`. The workflow maps into the
existing 30-column schema, including:

`content_id, word, normalized_word, meaning_vi, context_topic, source,
source_ref, publish_ok, review_status, status, dedupe_key, created_at,
updated_at`

Protect the editorial columns. Discord-created rows are only `draft` or
`needs_review`; this workflow uses `needs_review` and always leaves
`publish_ok` blank. Downstream publication must independently require
`publish_ok=OK` and editorial approval.

The workflow handles at most one accepted Discord message per execution and
deduplicates against both `source_ref` (Discord message ID plus batch index) and
the normalized semantic `dedupe_key`. Message edits or deletes never delete or
publish existing rows.

## Minimum permissions and secrets

- Discord: bot message-read access only in the approved guild/channel.
- Google: a service account shared only as Editor on the target spreadsheet
  (not Drive-wide access). Protect approval columns/ranges from that account.
- Never log request authorization headers, bot tokens, or private keys.
- Apply a per-user and per-channel rate limit, a 50-entry/message cap, request
  size limit, signature timestamp window, and bounded retries with jitter for
  429/5xx/timeouts. Reject other 4xx errors and send failures to a dead-letter
  queue with message ID and error class only.

## Dry run and rollback

`npm run test:n8n` covers the Discord ingest library, workflow contract,
idempotency, bounded retries, and approval gates. The repository test suite
does not call real Discord or Google APIs.

Rollout: import the workflow inactive, confirm the credential bindings, validate
the server/channel IDs, and test with a known safe Discord message. Activate only
this ingest workflow after the controlled test. Roll back by deactivating it.
Preserve the existing sheet rows and any idempotency records for audit.
