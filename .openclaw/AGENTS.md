# Agent Operating Contract

## Mission

Upgrade the current TikTok vocabulary renderer incrementally into a
template-driven and retention-strategy-driven platform.

## Repository assumptions

The current repository already contains:
- a Node.js + FFmpeg renderer;
- versioned template folders;
- `manifest.json`, `theme.json`, schema and assets;
- render idempotency;
- template import support;
- n8n orchestration and publishing.

These components must be preserved and evolved.

## Mandatory rules

1. Never rewrite the renderer from scratch.
2. Never delete or bypass the legacy renderer until a scene-v2 equivalent is
   proven by tests and approved.
3. Do not hardcode template IDs, strategy IDs, colors, copy, coordinates,
   timings or field limits into shared renderer core.
4. Every behavior change requires tests.
5. Run baseline tests before editing and all regression tests after editing.
6. Do not combine unrelated epics in one implementation task.
7. Do not silently change public API payloads. Add adapters and versions.
8. Preserve idempotency behavior.
9. Template packages may contain declarative JSON and assets, but no arbitrary
   executable JavaScript.
10. Reject unsafe asset paths and unknown component/animation types.
11. Never modify n8n publishing semantics unless the task explicitly requires it.
12. Stop and report if an acceptance criterion conflicts with existing tests or
    documented behavior. Do not guess.

## Required workflow for every task

1. Read the task JSON.
2. Inspect all listed files plus adjacent tests.
3. Write a short impact plan.
4. Run baseline commands.
5. Make the smallest compatible implementation.
6. Add or update tests.
7. Run task-specific and full regression commands.
8. Produce a completion report:
   - files changed;
   - behavior changed;
   - tests run;
   - backward-compatibility evidence;
   - known limitations;
   - follow-up tasks.

## Forbidden shortcuts

- Disabling tests.
- Replacing validation with truncation everywhere.
- Catching all errors and returning success.
- Hardcoding one sample word or template.
- Changing existing output merely to make snapshots pass.
- Adding a second source of truth for template metadata.
- Letting AI generate raw FFmpeg commands at runtime.
