# NEXT PHASE — TikTok Presentation & Template Platform
## Execution Specification for OpenClaw Agents

Repository: `CalisJI/social-media-builder`

Purpose: continue upgrading the TikTok vocabulary-video platform so new visual
styles, layouts, animation patterns, and retention formats can be added without
rewriting renderer core or breaking legacy templates.

This phase starts after the foundational work already completed or in review:

- TIKTOK-010 — normalized render-job adapter
- TIKTOK-020 — template engine router
- TIKTOK-030 — template-defined constraints
- TIKTOK-050 — strategy registry and classic strategy

---

# 1. Product goal

Evolve the platform from:

```text
content -> fixed renderer code -> MP4
```

to:

```text
content
  -> retention strategy
  -> presentation template
  -> component tree
  -> animation/timeline
  -> render engine
  -> MP4
```

The renderer becomes a generic execution engine. It must not hardcode:

- a specific TikTok template;
- a fixed scene order;
- fixed coordinates;
- a fixed hook;
- a fixed timeline;
- global content-length limits;
- a fixed animation sequence.

---

# 2. Architecture boundaries

## 2.1 Content

Content contains educational data only:

```json
{
  "word": "suspenseful",
  "ipa": "/səˈspens.fəl/",
  "part_of_speech": "adjective",
  "meaning_vi": "gây hồi hộp, căng thẳng hoặc mong chờ",
  "example_en": "It was a suspenseful movie.",
  "example_vi": "Đó là một bộ phim hồi hộp.",
  "common_mistake": null,
  "memory_tip": null
}
```

Content must not contain pixel coordinates, FFmpeg commands, font sizes, or
template-specific scene definitions.

## 2.2 Strategy

Strategy defines what is shown and in what retention order.

Initial strategies:

- `classic-definition-v1`
- `quiz-reveal-v1`
- `mistake-correction-v1`
- `pronunciation-challenge-v1`
- `story-context-v1`

A strategy controls:

- content roles;
- reveal order;
- stage duration;
- required fields;
- optional fields;
- retention behavior.

It does not control exact colors, positions, fonts, or assets.

## 2.3 Presentation template

Presentation template controls:

- scene layout;
- component placement;
- visual hierarchy;
- typography tokens;
- palette;
- assets;
- safe zones;
- transitions;
- field-specific overflow policy;
- compatible strategies and capabilities.

Templates must be declarative and data-driven.

## 2.4 Components

Initial reusable component registry:

- `HookText`
- `HeroWord`
- `IPA`
- `PartOfSpeechBadge`
- `MeaningCard`
- `ExampleCard`
- `TranslationText`
- `CTA`
- `ProgressBar`
- `QuizPrompt`
- `RevealCard`
- `WrongRightPanel`
- `BackgroundImage`
- `DecorativeShape`
- `AudioWave`
- `Countdown`

## 2.5 Animation registry

Initial animations:

- `none`
- `fade`
- `rise`
- `slide-left`
- `slide-right`
- `scale`
- `pulse`
- `type-on`
- `reveal-mask`

Templates may reference animation IDs but may not supply arbitrary executable code.

## 2.6 Renderer

Renderer responsibilities:

- validate render jobs;
- resolve strategy and template;
- validate compatibility;
- resolve constraints and adaptive layout;
- compile component tree and timeline;
- render deterministic MP4;
- run artifact QA;
- persist render metadata.

Renderer must not translate, select words, query dictionaries, publish TikTok,
or generate educational content.

---

# 3. Target repository structure

```text
renderer/src/
  model/
    normalize-render-job.mjs
  strategy/
    load-strategies.mjs
    resolve-strategy.mjs
    validate-strategy.mjs
  template/
    load-template-registry.mjs
    resolve-template.mjs
    validate-template.mjs
    validate-capabilities.mjs
  presentation/
    build-presentation-tree.mjs
    resolve-layout.mjs
    resolve-style-tokens.mjs
  components/
    registry.mjs
    text.mjs
    box.mjs
    image.mjs
    progress.mjs
    quiz.mjs
    wrong-right.mjs
  animation/
    registry.mjs
    compile-animation.mjs
  layout/
    adaptive-text.mjs
    measure-text.mjs
    resolve-overflow.mjs
  compiler/
    compile-scenes.mjs
    compile-component.mjs
    compile-timeline.mjs
  engines/
    legacy-v1.mjs
    scene-v2.mjs
  qa/
    inspect-artifact.mjs

strategies/
  classic-definition-v1.json
  quiz-reveal-v1.json
  mistake-correction-v1.json
  pronunciation-challenge-v1.json

templates/
  vocabulary-pastel-v1/
  vocabulary-pastel-scene-v2/
  vocabulary-quiz-v1/
  vocabulary-mistake-v1/
```

Do not move everything in one task. Use adapters and parallel engines.

---

# 4. Execution plan

## PHASE A — Presentation contract

### UI-001 — Define presentation schema

Create a versioned schema for declarative presentation templates.

Minimum structure:

```json
{
  "presentationSchemaVersion": 1,
  "template_id": "vocabulary-quiz-v1",
  "engine": "scene-v2",
  "compatibleStrategies": ["quiz-reveal-v1"],
  "capabilities": {
    "quizReveal": true,
    "wrongRight": false,
    "progressBar": true
  },
  "scenes": [],
  "styles": {},
  "constraints": {}
}
```

Acceptance criteria:

- rejects unknown scene/component types;
- rejects unsafe asset paths;
- supports schema versioning;
- legacy templates remain valid through `legacy-v1`;
- no existing render output changes.

Required tests:

- valid presentation;
- missing version;
- duplicate component ID;
- unknown component type;
- unsafe asset path;
- invalid capability declaration.

### UI-002 — Create component registry

Initial primitives:

- text;
- box;
- image;
- progress;
- group.

Each component must have a stable type ID, validation, layout input, style input,
timeline input, and compiler.

Acceptance criteria:

- one central registry;
- no template-ID checks in shared compiler;
- unknown component returns `invalid_template`;
- no arbitrary code execution;
- legacy renderer unchanged.

### UI-003 — Add design-token system

Token groups:

```json
{
  "colors": {},
  "typography": {},
  "spacing": {},
  "radius": {},
  "shadows": {},
  "motion": {}
}
```

Acceptance criteria:

- templates reference named tokens;
- compiler contains no template color constants;
- invalid token references fail before rendering;
- fonts stay restricted to approved fonts;
- existing template can be represented using tokens.

---

## PHASE B — Presentation tree and scene compiler

### UI-010 — Build presentation tree

Combine:

```text
Normalized Render Job + Strategy + Template
```

into:

```json
{
  "scenes": [
    {
      "id": "scene-hook",
      "start": 0,
      "duration": 1.2,
      "components": []
    }
  ]
}
```

Acceptance criteria:

- actionable errors for missing strategy fields;
- optional components omitted safely;
- deterministic output;
- source content remains unchanged;
- presentation tree contains no FFmpeg syntax.

### UI-011 — Build scene-v2 compiler

Initial primitives:

- text;
- box;
- image;
- progress;
- group.

Initial animations:

- none;
- fade;
- rise;
- slide-left;
- slide-right;
- scale.

Acceptance criteria:

- `scene-v2` runs beside `legacy-v1`;
- existing template stays on `legacy-v1`;
- unknown primitive/animation fails validation;
- no template-specific branch;
- filter graph snapshot tests exist.

### UI-012 — Build pastel scene-v2 parity template

Recreate the existing pastel template using only a template package.

Rules:

- do not delete the legacy pastel template;
- do not add `if (template_id === ...)` in renderer core;
- add missing capability generically.

Acceptance criteria:

- fixture set renders successfully;
- visual result is acceptably close to legacy and documented;
- package contains only manifest, presentation config, tokens, scenes and assets;
- all legacy tests pass.

Required demo fixtures:

- short word;
- long word;
- short meaning;
- long valid meaning;
- missing IPA;
- Vietnamese diacritics.

---

## PHASE C — Adaptive layout

### UI-020 — Template-defined overflow policies

Supported policies:

- `error`
- `wrap`
- `shrink`
- `alternate-layout`
- `split-scene`
- `truncate` only when explicitly allowed

Example:

```json
{
  "meaning_vi": {
    "maxLines": 4,
    "preferredFontSize": 47,
    "minFontSize": 34,
    "overflow": ["wrap", "shrink", "split-scene", "error"]
  }
}
```

Acceptance criteria:

- full source content stays unchanged;
- renderer no longer rejects long meaning solely because of a global 90-character cap;
- no silent truncation of educational content;
- errors include field, measured size, and failed policy;
- each template can declare a different policy.

### UI-021 — Adaptive typography

Resolution order:

1. preferred size;
2. wrap;
3. shrink to minimum;
4. alternate layout;
5. split scene;
6. structured failure.

Acceptance criteria:

- Vietnamese characters are handled;
- minimum font size is never violated;
- deterministic output;
- boundary stress fixtures included.

### UI-022 — Split-scene support

Acceptance criteria:

- strategy explicitly allows splitting;
- timeline is recomputed deterministically;
- maximum duration is enforced;
- CTA remains visible;
- split scene is recorded in warnings and render metadata.

---

## PHASE D — TikTok retention formats

### RET-001 — Quiz Reveal

Sequence:

```text
hook/question
-> guess window
-> reveal
-> meaning
-> example
-> CTA
```

Acceptance criteria:

- implemented through strategy/template packages;
- configurable guess duration;
- no renderer-core template branch;
- preview MP4 attached.

### RET-002 — Mistake Correction

Sequence:

```text
wrong usage
-> pause
-> correction reveal
-> explanation
-> example
-> CTA
```

Required metadata:

- `common_mistake`
- `corrected_usage`

Acceptance criteria:

- missing metadata fails before FFmpeg;
- renderer invents no content;
- wrong/right component is reusable;
- preview MP4 attached.

### RET-003 — Pronunciation Challenge

Sequence:

```text
word
-> pronunciation prompt
-> countdown
-> IPA/audio reveal
-> example
-> CTA
```

Acceptance criteria:

- audio requirement is declared;
- missing required audio gives actionable error;
- countdown component is reusable;
- audio behavior is strategy/template-driven.

### RET-004 — Deterministic strategy selector

Priority:

1. explicitly requested strategy;
2. configured metadata rules;
3. classic fallback.

Rules must live in JSON configuration, not hardcoded renderer `if/else`.

Acceptance criteria:

- deterministic;
- unknown strategy fails clearly;
- rules have unit tests;
- selected strategy is stored in render metadata.

---

## PHASE E — Template management UI

### ADMIN-001 — Template list UI

Display:

- template ID;
- engine;
- schema version;
- lifecycle status;
- compatible strategies;
- capabilities;
- latest validation;
- latest preview;
- active/deprecated state.

Acceptance criteria:

- read-only first version;
- no secret exposure;
- validation errors visible;
- both legacy and scene-v2 templates visible.

### ADMIN-002 — Template editor UI

Sections:

- metadata;
- palette;
- typography;
- spacing;
- safe zones;
- scene list;
- component tree;
- timeline;
- constraints;
- capabilities;
- compatible strategies.

The first version may combine structured forms with a JSON editor.

Acceptance criteria:

- validation before save;
- invalid configuration cannot activate;
- UI cannot submit arbitrary JavaScript;
- changes create a new versioned template;
- active template remains unchanged until activation.

### ADMIN-003 — Preview UI

Flow:

```text
edit/import
-> validate
-> select fixture
-> render preview
-> inspect
-> approve
-> activate
```

Required fixtures:

- short word;
- long word;
- short meaning;
- long meaning;
- missing optional fields;
- Vietnamese accents;
- overflow stress.

Acceptance criteria:

- preview never publishes;
- preview is visibly marked;
- validation/render errors displayed;
- activation impossible without successful preview.

### ADMIN-004 — Template lifecycle APIs

Add:

- `GET /v1/templates`
- `POST /v1/templates/validate`
- `POST /v1/templates/preview`
- `POST /v1/templates/activate`
- `POST /v1/templates/deprecate`

Lifecycle:

```text
imported -> validated -> previewed -> active -> deprecated
```

Acceptance criteria:

- import does not auto-activate;
- admin authorization required;
- active-template history preserved;
- rollback to a prior active template supported.

---

# 5. Evidence and human review

## QA-001 — PR evidence report

Every implementation PR must include:

- requirement;
- acceptance criteria;
- files changed;
- tests added;
- tests run;
- backward compatibility;
- architecture compliance;
- demo artifacts;
- known limitations;
- risk;
- rollback plan.

“Tests pass” alone is not sufficient.

## QA-002 — Visual evidence

For presentation/render changes attach:

- input payload;
- resolved strategy;
- resolved template;
- presentation tree;
- MP4;
- selected frame screenshots;
- `ffprobe` result;
- render warnings.

## QA-003 — Architecture reviewer gate

Reviewer must explicitly answer:

- Is any template ID hardcoded in shared core?
- Is any strategy ID hardcoded in shared core?
- Can another template reuse this capability?
- Are `legacy-v1` requests still supported?
- Are constraints template-defined?
- Is source content preserved?
- Are errors structured?
- Are tests meaningful instead of snapshot-only updates?

Decision must be one of:

```text
APPROVE
REQUEST CHANGES
REJECT
```

---

# 6. Agent coordination

## Orchestrator

The orchestrator must:

1. read this document;
2. inspect merged tasks;
3. create missing issues;
4. build a dependency graph;
5. assign one task per branch;
6. prevent concurrent edits to overlapping core files;
7. require reviewer approval;
8. never merge solely because tests pass.

## Developer agent

The developer agent must:

- implement one task only;
- preserve compatibility;
- add tests;
- provide evidence;
- never self-approve.

## Reviewer agent

The reviewer agent must:

- not implement fixes during review;
- check acceptance criteria;
- inspect architectural violations;
- run tests;
- reject hardcoding;
- require visual evidence for presentation changes.

## Human admin

The human admin verifies:

- demo video looks correct;
- long text remains readable;
- legacy output still works;
- new template can be added without core edits;
- activation and rollback work;
- evidence matches product expectations.

The human admin is not expected to read every changed source file.

---

# 7. Recommended execution order

```text
UI-001
-> UI-002
-> UI-003
-> UI-010
-> UI-011
-> UI-012
-> UI-020
-> UI-021
-> UI-022
-> RET-001
-> RET-002
-> RET-003
-> RET-004
-> ADMIN-001
-> ADMIN-002
-> ADMIN-003
-> ADMIN-004
-> QA-001
-> QA-002
-> QA-003
```

Parallel execution is allowed only for tasks that do not modify overlapping core files.

---

# 8. Phase Definition of Done

The next phase is complete only when:

- legacy templates still render;
- scene-v2 renders at least one production-ready template;
- a new visual template can be added without renderer-core edits;
- a new retention strategy can be added without renderer-core edits;
- long meanings use adaptive layout;
- admin UI supports validate, preview and activate;
- template activation supports rollback;
- all render PRs include visual evidence;
- templates cannot execute arbitrary code;
- n8n remains orchestration/publishing only.
