# Repository Agent Rules — Video Design Engine

## Primary mission

Improve the quality and reusability of video rendering. The first priority is the TikTok Gold Standard module defined in `docs/video-design-engine/`.

## Read first

All agents must read `docs/video-design-engine/00_READ_ME_FIRST.md` and the documents it references before work.

## Protected working functionality

Do not rewrite working platform authentication, connected accounts, scheduling, upload, or publishing flows unless a task explicitly requires a compatibility change.

## Templates

- Templates are validated versioned data.
- No fixture-specific or word-specific rendering logic.
- Generic renderer primitives may be added only with tests and architecture alignment.
- Every text node must have bounds, minimum size, max lines, and overflow strategy.

## Audio

- Silent or inaudible output is a blocking failure.
- Missing required audio assets must not silently pass.
- Voice must take priority over music.

## Workflow

- Claim only an unblocked task from `governance/tasks.json`.
- Work on the existing assigned branch/PR.
- Report exact commands and results.
- Attach rendered artifacts for visual work.
- Do not self-approve or merge.
- Address every blocking reviewer finding.

## Completion

Code completion is not task completion. Acceptance criteria, evidence, quality gates, and required approvals must be satisfied.

