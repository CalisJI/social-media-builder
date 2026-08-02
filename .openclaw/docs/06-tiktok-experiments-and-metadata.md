# TikTok Experiments and Metadata

## Render request additions

```json
{
  "presentation": {
    "platform": "tiktok",
    "template_id": "vocabulary-quiz-v1",
    "strategy_id": "quiz-reveal-v1",
    "experiment_id": "hook-test-2026-08",
    "variant_id": "B",
    "pacing": "fast"
  }
}
```

All fields are optional for legacy requests.

## Render manifest additions

Persist:
- content_id
- template_id
- template version/schema version
- strategy_id
- experiment_id
- variant_id
- normalized payload hash
- artifact hash
- duration
- render time
- warnings
- created_at

This creates the join key for future TikTok analytics without adding analytics
collection in the first implementation.
