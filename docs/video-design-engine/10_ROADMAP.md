# Roadmap

## Roadmap strategy

Deliver one visible TikTok success first, then extract reusable systems and add reference-image template creation. Later capabilities must not delay the fast track.

## Phase 0 — Alignment and containment

Goal: establish source of truth and prevent unrelated work.

Deliverables:

- documents committed;
- task graph loaded;
- current render/publish boundaries identified;
- unrelated renderer feature tasks paused;
- ownership and reviewer identities confirmed.

Exit criteria:

- orchestrator can select the first task;
- no dependency ambiguity;
- existing publishing flow is protected.

## Phase 1 — TikTok Gold Standard Fast Track

Goal: one publish-ready module.

Workstreams:

- visual specification;
- minimal Template DSL;
- required generic primitives;
- adaptive typography/layout;
- motion presets;
- audio pipeline;
- preview;
- acceptance;
- save to library;
- production QA.

Exit criteria:

- owner-approved MP4;
- accepted template saved;
- second content item rendered without code change;
- independent approval;
- publishing smoke test.

## Phase 2 — Reusable Template Foundation

Goal: extract the proven design into stable reusable systems.

Deliverables:

- formal registry/version model;
- design token registry;
- asset catalog;
- template compiler hardening;
- library UI improvements;
- template duplication/version editing;
- expanded test matrix.

Exit criteria:

- at least two visual variants use shared primitives;
- accepted versions are immutable and reproducible;
- rollback works.

## Phase 3 — Reference Image to Candidate Template

Goal: user uploads a reference image and receives a safe candidate.

Deliverables:

- upload and storage;
- structured design analysis;
- mapping to supported tokens/primitives;
- candidate generation;
- sample preview;
- user revision controls;
- acceptance and library persistence.

Exit criteria:

- at least three distinct reference images produce usable candidates;
- no arbitrary runtime code generation;
- accepted candidate renders new content deterministically.

## Phase 4 — Creative Director and Template Evaluation

Goal: improve candidates and template choice without making AI mandatory.

Deliverables:

- CreativePlan generation;
- template recommendation;
- visual scoring;
- controlled revision loop;
- design knowledge base;
- evidence-backed QA suggestions.

Exit criteria:

- app still renders with AI disabled;
- AI plans validate against schemas;
- quality improves without renderer code edits.

## Phase 5 — Additional Content Modules

Candidates:

- quote/motivation;
- listicle;
- product highlight;
- news explainer;
- before/after;
- tutorial steps.

Each module must reuse the engine and follow the same approval/library lifecycle.

## Phase 6 — Scale and ecosystem

Deferred until quality and library adoption are proven:

- team collaboration;
- cloud render scaling;
- marketplace;
- plugin SDK;
- analytics-driven optimization;
- A/B testing;
- video-to-template.

## Priority rule

If Phase 1 is not complete, tasks from Phase 3+ may only proceed when they remove a direct blocker and do not consume the critical implementation/reviewer capacity.

