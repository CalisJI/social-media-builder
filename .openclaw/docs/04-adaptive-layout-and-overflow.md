# Adaptive Layout and Overflow

## Problem

Current fixed character limits reject otherwise valid content before rendering.
Different templates have different capacities, so constraints belong to each
template, not a global renderer constant.

## Constraint example

```json
{
  "constraints": {
    "meaning_vi": {
      "maxLines": 4,
      "fontSize": {"min": 34, "preferred": 47, "max": 52},
      "overflow": ["wrap", "shrink", "split-scene", "error"]
    }
  }
}
```

## Resolution order

1. Normalize whitespace.
2. Wrap using measured/estimated width.
3. Reduce font size to declared minimum.
4. Use alternate layout if declared.
5. Split into an additional scene if strategy permits.
6. Return a structured `text_overflow` error.

## Rules

- Never truncate educational meaning silently.
- `word` generally uses `error`.
- Meaning prefers wrap -> shrink -> split-scene.
- Examples prefer wrap -> shrink; truncation only if explicitly declared.
- Return field name, measured result, and failed constraint in errors.
