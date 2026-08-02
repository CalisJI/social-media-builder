# OpenClaw TikTok Platform Upgrade Pack

This package is an execution framework for upgrading `CalisJI/social-media-builder`
without rebuilding the platform from scratch.

## Scope

The first target is TikTok vocabulary video generation. n8n remains the
orchestration and publishing layer. The repository remains the source of truth
for renderer, template, preview, validation, and experiment behavior.

## Import / usage

1. Copy this folder into the repository as `.openclaw/`.
2. Ask the OpenClaw orchestrator to read:
   - `.openclaw/AGENTS.md`
   - `.openclaw/orchestration/master-plan.yaml`
   - `.openclaw/tasks/*.json`
3. The orchestrator must create a fresh branch and run the baseline gate before
   assigning implementation work.
4. Execute one task at a time in dependency order.
5. A task is complete only after its acceptance criteria and regression tests pass.

## Non-negotiable outcome

- Existing `legacy-v1` rendering and API behavior keep working.
- New visual styles can be introduced using template packages.
- New retention patterns can be introduced using strategy configuration.
- Long text is handled by template-specific adaptive layout rules.
- Templates pass validate -> preview -> activate before production use.
- No agent may hardcode a new template ID or strategy into renderer core.
