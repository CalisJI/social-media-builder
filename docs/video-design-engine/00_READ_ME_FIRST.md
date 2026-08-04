# Social Media Builder — Video Design Engine Execution Pack

## Mission

Build a **professional, reusable Video Design Engine** inside the existing Social Media Builder application.

The existing account connections, platform integrations, publishing flows, and video upload capabilities are considered complete and are **out of scope unless a rendering change breaks them**.

The only product problem this program must solve is:

> The application must consistently render attractive, readable, audible, publish-ready short-form videos, beginning with one high-quality TikTok module.

## First visible result

The first milestone is not a marketplace, a generic AI platform, or dozens of templates.

The first milestone is:

> One TikTok 9:16 vocabulary/pronunciation module that the owner is willing to publish on a real channel.

It must include:

- strong visual hierarchy;
- intentional composition and motion;
- clearly audible voice, music, and sound effects;
- adaptive text fitting;
- safe-area compliance;
- preview, approval, and reusable template saving;
- data-driven template definitions, not one-off hardcoded scenes.

## Core product workflow

```text
User content or reference image
        ↓
Template selection or template generation
        ↓
Preview render
        ↓
User accepts / rejects / adjusts
        ↓
Accepted template is versioned and saved to Template Library
        ↓
Future content can reuse the template without an agent
        ↓
Production render and existing publishing flow
```

## Non-negotiable principles

1. **The app must work without an agent.** Agents may design or propose templates, but the runtime must render deterministically from data.
2. **Templates are data, not bespoke code.** React/Remotion components provide generic primitives; template definitions configure them.
3. **One gold-standard TikTok module comes first.** Do not build broad infrastructure before a publish-ready result is visible.
4. **No historical video audit project.** Old renders are not re-reviewed unless used as a debugging reference.
5. **Do not rewrite working publishing integrations.** Preserve existing upload, OAuth, scheduling, and platform connectors.
6. **Audio is mandatory.** Silent output, missing tracks, inaudible speech, or music masking voice are release-blocking defects.
7. **User approval creates a reusable asset.** Once a preview is accepted, the template enters the library with versioning and provenance.
8. **No fixture-specific hardcoding.** Fix the design system, primitive, constraint, or template rule that caused the defect.
9. **Visual acceptance outranks test count.** Passing automated tests is necessary but not sufficient.
10. **Independent reviewer decisions are authoritative.** Implementation agents do not self-approve or merge.

## Required reading order for agents

1. `00_READ_ME_FIRST.md`
2. `01_PRODUCT_SCOPE_AND_SUCCESS.md`
3. `02_TIKTOK_GOLD_STANDARD_MODULE.md`
4. `03_VIDEO_DESIGN_ENGINE_ARCHITECTURE.md`
5. `04_TEMPLATE_DSL_AND_SCHEMAS.md`
6. `05_REFERENCE_IMAGE_TO_TEMPLATE.md`
7. `06_PREVIEW_APPROVAL_AND_LIBRARY.md`
8. `07_AUDIO_MOTION_AND_ASSETS.md`
9. `08_AGENT_ORCHESTRATION.md`
10. `09_PRODUCTION_QUALITY_GATES.md`
11. `10_ROADMAP.md`
12. `11_TASK_BACKLOG.md`
13. `12_MASTER_AGENT_PROMPT.md`

## Execution rule

No agent may start a task whose dependencies are not satisfied. The source of truth is:

- `governance/tasks.json`
- `governance/execution_manifest.yaml`
- the latest merged architecture decision records in the repository.

The fastest path is the **TikTok Gold Standard Fast Track**. Later phases must not delay it.

