# Production Quality Gates

## Gate philosophy

A video is not ready because the renderer completed. It is ready when schema, visual, audio, technical, product, and governance gates all pass.

## Gate 1 — Schema and plan

- content validates;
- template version validates;
- all bindings resolve;
- assets exist and are approved;
- every text node has bounds and overflow behavior;
- scene timeline compiles;
- no unresolved validation errors.

## Gate 2 — Visual static checks

- elements remain within canvas and declared safe area;
- text boxes do not overflow;
- font size is not below minimum;
- contrast meets project thresholds;
- essential elements do not overlap;
- no unsupported missing glyphs;
- no accidental empty frame.

## Gate 3 — Sampled-frame visual review

Sample at:

- start of each scene;
- midpoint of each scene;
- transition boundaries;
- final frame;
- known maximum motion moments.

Review for:

- hierarchy;
- readability;
- clipping;
- unintended blank areas;
- visual balance;
- transition continuity;
- brand consistency;
- safe-area compliance.

## Gate 4 — Audio

- required stream exists;
- voice is audible;
- music is audible but subordinate;
- SFX align with cue points;
- no clipping;
- no unexplained silence;
- fades are correct;
- final mux includes AAC track.

## Gate 5 — Technical media

- resolution/profile correct;
- duration within contract;
- frame rate correct;
- codec correct;
- pixel aspect correct;
- no broken/corrupt frames;
- production bitrate/profile configured;
- file opens in supported players.

## Gate 6 — Content variants

Required fixture matrix for first module:

- short word / short meaning;
- typical content;
- long word;
- long Vietnamese meaning;
- long English example;
- missing optional fields;
- accented Vietnamese characters;
- punctuation and quotes.

## Gate 7 — User acceptance

The Product Owner views at least one production-profile output and explicitly accepts it. This gate is mandatory for Gold Standard v1.

## Gate 8 — Independent review

The reviewer app/agent evaluates the latest head SHA and submits official approval. Previous approvals do not automatically cover later commits.

## Release decision

Only templates with all gates passed may be marked `active` and used as production defaults.

## Failure classification

- `BLOCKING_VISUAL`
- `BLOCKING_AUDIO`
- `BLOCKING_SCHEMA`
- `BLOCKING_ASSET`
- `BLOCKING_TECHNICAL`
- `NEEDS_PRODUCT_DECISION`
- `NON_BLOCKING_IMPROVEMENT`

## No false success

The following do not prove readiness:

- unit tests alone;
- a single screenshot;
- an agent statement without artifact;
- a low-resolution preview only;
- “audio track exists” without loudness validation;
- a review performed by the PR author identity.

