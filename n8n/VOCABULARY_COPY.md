# Vocabulary copy enrichment

Run enrichment only for rows still in `draft` or `needs_review`. Never write
over an approved row. The renderer limits remain the source of truth:
`meaning_vi` 90, `context_topic` 48, `example_en` 90, `example_vi` 100,
`hook` 42, and `cta` 54 characters.

## Default: deterministic copy

Use `buildVocabularyCopy()` from `src/lib/vocabulary-copy.mjs`. Its choice of
hook and CTA is stable for the same word, meaning and context, but varies across
entries. It fills missing examples, normalizes punctuation, truncates on word
boundaries and requires no external model. Always run
`validateVocabularyCopy()` before saving.

## Optional AI rewrite

AI is useful only when a reviewer asks for a more idiomatic example or when the
source meaning/context is too thin for deterministic phrasing. Keep the model
node optional, low-temperature (`0.4`), JSON-only, and time bounded. Send no
credentials or user identifiers.

System prompt:

> You edit concise English-learning copy for Vietnamese vertical video.
> Return only JSON with meaning_vi, context_topic, example_en, example_vi, hook,
> cta. Preserve the supplied sense and part of speech. Write one natural,
> everyday example and a faithful Vietnamese translation. Vary hook and CTA
> according to the word and context; avoid clickbait and fixed slogans. Respect
> limits: 90/48/90/100/42/54 characters in the field order above. Do not add
> facts, hashtags, emojis, URLs or claims. Do not change approval metadata.

Reject AI output and use the deterministic result when JSON parsing fails, a
field is missing, `validateVocabularyCopy()` fails, the meaning changes, or the
model times out. AI output must still enter `needs_review`; it never sets
`publish_ok`, `review_status=approved`, or any publish field.

Recommended n8n sequence:

1. Build deterministic copy.
2. If `AI_COPY_ENABLED=true` and editorial rewrite is requested, call the model.
3. Parse and validate the model JSON.
4. Select valid AI output, otherwise deterministic output.
5. Update only a non-approved row and retain `needs_review`.
