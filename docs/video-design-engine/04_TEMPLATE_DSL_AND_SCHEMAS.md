# Template DSL and Schemas

## Purpose

Templates must be reusable data records. Generic renderer components interpret this data. A template must not require a new custom React component for each design.

## Phase 1 DSL capabilities

The initial DSL must support:

- metadata and compatibility;
- canvas/platform profile;
- design tokens;
- scenes and duration rules;
- generic visual nodes;
- text slots;
- asset slots;
- audio cues;
- motion presets;
- constraints and safe areas;
- variants and overflow strategies;
- user-editable properties;
- provenance and versioning.

## Generic node types

Phase 1 allowed node types:

- `group`
- `stack`
- `grid`
- `card`
- `shape`
- `text`
- `richText`
- `image`
- `video`
- `icon`
- `lottie`
- `progress`
- `waveform`
- `brandMark`

Adding a node type requires an architecture decision and tests.

## Text node requirements

Every `text` or `richText` node must declare:

- content binding;
- bounds;
- typography token or approved override;
- preferred font size;
- minimum font size;
- maximum lines;
- line height;
- alignment;
- overflow strategy;
- motion preset;
- visibility rule.

## Overflow strategies

Supported:

- `wrap`
- `balance-wrap`
- `shrink-to-min`
- `layout-variant`
- `split-scene`
- `fail-validation`

Forbidden by default:

- silent clipping;
- uncontrolled overflow;
- font size below declared minimum;
- truncation of meanings/examples without explicit product approval.

## Template lifecycle

```text
draft → candidate → previewed → user_accepted → active
                     ↘ rejected
active → superseded / deprecated / archived
```

## Versioning

- Immutable accepted versions.
- New edit creates a new draft version.
- Semantic version or monotonic revision.
- Production renders store exact version ID.
- Rollback selects an earlier accepted version; no mutation.

## Sample minimal template

See `examples/tiktok-vocabulary-gold-v1.template.json`.

## Schema files

- `schemas/template.schema.json`
- `schemas/content.schema.json`
- `schemas/creative_plan.schema.json`
- `schemas/template_record.schema.json`

## Compiler policy

The compiler must reject:

- unknown node types;
- missing text bounds;
- missing font minimums;
- unregistered assets;
- audio references without assets;
- unsupported motion presets;
- timeline overlap that violates scene rules;
- unsafe platform placement;
- template versions with unresolved validation errors.

## User-editable controls

A template may expose safe controls such as:

- accent color preset;
- logo asset;
- music preset;
- motion intensity;
- background style variant;
- CTA copy;
- scene duration within limits.

Users must not edit arbitrary code, file paths, or unvalidated expressions.

