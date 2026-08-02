# TikTok Retention Strategy Engine

## Purpose

Separate “how attention is retained” from “how the video looks”.

## Initial strategy set

### classic-definition-v1
Hook -> word -> meaning -> example -> CTA.
This reproduces current behavior.

### quiz-reveal-v1
Question/word -> short guess window -> meaning reveal -> example -> CTA.

### mistake-correction-v1
Incorrect use -> correction reveal -> explanation/example -> CTA.
Requires `common_mistake`.

### pronunciation-challenge-v1
Word/audio prompt -> viewer attempt -> IPA/audio reveal -> example -> CTA.
Requires pronunciation audio or an explicitly supported fallback.

## Strategy JSON contract

```json
{
  "id": "quiz-reveal-v1",
  "strategySchemaVersion": 1,
  "platform": "tiktok",
  "duration": {"min": 8, "max": 14, "default": 10},
  "requires": ["word", "meaning_vi"],
  "optional": ["example_en", "example_vi", "ipa"],
  "capabilitiesRequired": ["quizReveal"],
  "stages": [
    {"id": "hook", "role": "hook", "start": 0, "duration": 1.2},
    {"id": "guess", "role": "word", "start": 1.2, "duration": 2.0},
    {"id": "reveal", "role": "meaning_vi", "start": 3.2, "duration": 2.2},
    {"id": "example", "role": "example_en", "start": 5.4, "duration": 2.8},
    {"id": "cta", "role": "cta", "start": 8.2, "duration": 1.8}
  ]
}
```

## Selection

1. Explicit `presentation.strategy_id`.
2. Configured deterministic selection rules.
3. `classic-definition-v1` fallback.

The initial selector must not use an LLM. It must be deterministic and testable.
