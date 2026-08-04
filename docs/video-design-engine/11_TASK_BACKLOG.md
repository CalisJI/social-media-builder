# Task Backlog

The machine-readable source is `governance/tasks.json`. This document groups the work for humans.

## Phase 0 — Foundation

- `SMB-VE-001` Commit execution pack and declare scope.
- `SMB-VE-002` Map existing render entrypoints and publishing boundary.
- `SMB-VE-003` Establish execution-status and task-claim mechanism.
- `SMB-VE-004` Confirm implementation and reviewer GitHub identities are independent.
- `SMB-VE-005` Pause unrelated renderer expansion tasks.

## Phase 1A — Gold Standard design

- `SMB-VE-010` Define TikTok module content fixtures.
- `SMB-VE-011` Create scene-by-scene visual specification.
- `SMB-VE-012` Define v1 design tokens and font registry.
- `SMB-VE-013` Define v1 motion and audio cue sheet.
- `SMB-VE-014` Produce representative still/mockup evidence.
- `SMB-VE-015` Product-owner design checkpoint.

## Phase 1B — Minimal engine contracts

- `SMB-VE-020` Implement content schema validation.
- `SMB-VE-021` Implement minimal template schema validation.
- `SMB-VE-022` Implement template compiler skeleton.
- `SMB-VE-023` Implement platform profile and safe areas.
- `SMB-VE-024` Implement asset registry minimum.
- `SMB-VE-025` Implement deterministic render-plan snapshot.

## Phase 1C — Layout and typography

- `SMB-VE-030` Build generic bounded text primitive.
- `SMB-VE-031` Add real text measurement and balanced wrapping.
- `SMB-VE-032` Add shrink-to-min and validation behavior.
- `SMB-VE-033` Add layout variants and split-scene strategy.
- `SMB-VE-034` Add overflow/collision tests.
- `SMB-VE-035` Add Vietnamese glyph/font checks.

## Phase 1D — Motion and visuals

- `SMB-VE-040` Implement motion preset registry.
- `SMB-VE-041` Implement seven Gold Standard presets.
- `SMB-VE-042` Implement generic decorative asset slots.
- `SMB-VE-043` Implement scene transition primitives.
- `SMB-VE-044` Build TikTok Gold Standard template definition.

## Phase 1E — Audio

- `SMB-VE-050` Implement audio asset catalog and preset schema.
- `SMB-VE-051` Add voice/pronunciation track binding.
- `SMB-VE-052` Add music and SFX cues.
- `SMB-VE-053` Add ducking, fades, and gain configuration.
- `SMB-VE-054` Add audio analysis and blocking gates.
- `SMB-VE-055` Add missing-audio failure behavior.

## Phase 1F — Preview, acceptance, and library

- `SMB-VE-060` Render preview from candidate template.
- `SMB-VE-061` Create preview-session record.
- `SMB-VE-062` Add accept/reject/revise actions.
- `SMB-VE-063` Save accepted template as immutable library version.
- `SMB-VE-064` Add template picker and reuse path.
- `SMB-VE-065` Render second content item from saved template.

## Phase 1G — QA and release

- `SMB-VE-070` Add static layout gate.
- `SMB-VE-071` Add sampled-frame contact sheet/report.
- `SMB-VE-072` Add technical media validation.
- `SMB-VE-073` Run fixture matrix.
- `SMB-VE-074` Product-owner production acceptance.
- `SMB-VE-075` Independent reviewer approval.
- `SMB-VE-076` Smoke test existing TikTok publishing flow.
- `SMB-VE-077` Activate Gold Standard v1 default template.

## Phase 2 — Reusable foundation

- `SMB-VE-100` Formalize template registry and immutable versioning.
- `SMB-VE-101` Add template duplication and draft editing.
- `SMB-VE-102` Add rollback and compatibility checks.
- `SMB-VE-103` Expand design token registry.
- `SMB-VE-104` Expand approved asset library.
- `SMB-VE-105` Add second visual variant using shared primitives.
- `SMB-VE-106` Add renderer reproducibility manifest.

## Phase 3 — Reference image workflow

- `SMB-VE-130` Add reference-image upload and provenance.
- `SMB-VE-131` Define design-analysis schema.
- `SMB-VE-132` Implement image analysis adapter.
- `SMB-VE-133` Map analysis to supported tokens/primitives.
- `SMB-VE-134` Generate candidate CreativePlan.
- `SMB-VE-135` Generate candidate Template DSL.
- `SMB-VE-136` Render normal and stress previews.
- `SMB-VE-137` Add safe user revision controls.
- `SMB-VE-138` Accept and save image-derived template.
- `SMB-VE-139` Validate three reference-image cases.

## Phase 4 — AI creative assistance

- `SMB-VE-160` Implement optional Creative Director interface.
- `SMB-VE-161` Add template recommendation.
- `SMB-VE-162` Add design knowledge-base retrieval.
- `SMB-VE-163` Add candidate scoring and explanations.
- `SMB-VE-164` Add bounded revision loop.
- `SMB-VE-165` Add AI-disabled fallback tests.

## Task completion rule

A task is complete only when its acceptance criteria in `tasks.json` are satisfied and evidence is attached. “Code written” is not a completion state.

