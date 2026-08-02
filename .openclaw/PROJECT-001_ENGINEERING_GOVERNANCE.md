# PROJECT-001 — Engineering Governance & Autonomous Agent Delivery System
## Single Execution File for OpenClaw Agents

Repository: `CalisJI/social-media-builder`

---

# 1. Mission

Build a lightweight engineering-governance system so AI Agents can:

- decompose the platform roadmap into manageable tasks;
- coordinate dependencies;
- show clear project progress;
- provide evidence for every completed task;
- allow a non-programmer project owner to review progress in under five minutes;
- prevent features from being marked complete only because tests passed;
- prevent new work from breaking previous working behavior.

This task does **not** implement new renderer, UI, template, retention, publishing,
or TikTok features.

The output of this task is the management system that all later Agent tasks must
follow.

---

# 2. Mandatory Agent rules

All Agents must obey these rules.

1. Do not rewrite the application or renderer.
2. Do not modify product behavior in this task.
3. Do not hardcode project progress percentages manually in multiple places.
4. Use one canonical source of truth for task status.
5. One implementation task per branch and Pull Request.
6. A Developer Agent cannot approve its own Pull Request.
7. A task is not complete until evidence and reviewer approval exist.
8. Passing tests alone is not enough to mark a task complete.
9. Never silently change unrelated files.
10. Every merged task must update project status or trigger its generation.
11. If information is unknown, write `UNKNOWN` or create a blocker. Do not guess.
12. Existing GitHub Issues and merged Pull Requests must be inventoried before
    creating duplicate tasks.

---

# 3. Required files

Create the following structure:

```text
docs/governance/
├── ROADMAP.md
├── PROJECT_STATUS.md
├── CAPABILITY_MATRIX.md
├── DELIVERY_PROCESS.md
├── AGENT_RULEBOOK.md
├── REVIEW_CHECKLIST.md
├── RISK_REGISTER.md
└── README.md

.github/
├── ISSUE_TEMPLATE/
│   ├── implementation-task.yml
│   ├── bug-report.yml
│   └── architecture-decision.yml
├── PULL_REQUEST_TEMPLATE.md
└── workflows/
    └── governance-check.yml

project/
├── tasks.json
├── capabilities.json
├── phases.json
└── schemas/
    ├── task.schema.json
    ├── capability.schema.json
    └── evidence.schema.json

scripts/governance/
├── validate-project-data.mjs
├── generate-roadmap.mjs
├── generate-project-status.mjs
├── generate-capability-matrix.mjs
└── check-pr-evidence.mjs
```

Existing repository conventions may require adjusted paths. If so, document the
reason and preserve the same responsibilities.

---

# 4. Canonical source of truth

## 4.1 `project/tasks.json`

This file is the canonical task registry.

Minimum schema per task:

```json
{
  "id": "UI-001",
  "title": "Define presentation schema",
  "phase": "presentation-foundation",
  "type": "feature",
  "priority": "high",
  "status": "ready",
  "owner": null,
  "issueNumber": null,
  "pullRequestNumber": null,
  "dependsOn": ["TIKTOK-020", "TIKTOK-050"],
  "unlocks": ["UI-002", "UI-010"],
  "capabilities": ["presentation-schema"],
  "acceptanceCriteria": [
    "Presentation schema is versioned",
    "Unknown component types are rejected",
    "Legacy templates remain supported"
  ],
  "requiredEvidence": [
    "test-report",
    "architecture-review"
  ],
  "risk": "medium",
  "blockedReason": null,
  "startedAt": null,
  "completedAt": null,
  "verifiedAt": null
}
```

Allowed statuses:

```text
backlog
ready
in_progress
in_review
merged
verified
released
blocked
cancelled
```

Status meaning:

- `backlog`: known but not ready;
- `ready`: dependencies satisfied and acceptance criteria defined;
- `in_progress`: assigned and actively implemented;
- `in_review`: Pull Request open and implementation finished;
- `merged`: code merged, but human/product verification may still be pending;
- `verified`: evidence accepted and capability confirmed;
- `released`: deployed to intended environment;
- `blocked`: cannot proceed;
- `cancelled`: intentionally stopped.

A task must not jump directly from `in_progress` to `verified`.

## 4.2 `project/capabilities.json`

This file tracks what the platform can actually do.

Example:

```json
{
  "id": "template-engine-router",
  "name": "Template engine routing",
  "category": "renderer",
  "status": "available",
  "implementedBy": ["TIKTOK-020"],
  "evidence": {
    "pullRequests": [27],
    "tests": ["renderer engine-router tests"]
  },
  "humanVerificationRequired": false,
  "notes": "Unknown engines return structured invalid_template errors."
}
```

Allowed capability statuses:

```text
not_started
partial
available
verified
deprecated
```

A task being merged does not automatically mean a capability is verified.

## 4.3 `project/phases.json`

Example:

```json
[
  {
    "id": "renderer-foundation",
    "name": "Renderer foundation",
    "order": 1,
    "taskIds": [
      "TIKTOK-010",
      "TIKTOK-020",
      "TIKTOK-030",
      "TIKTOK-050"
    ]
  },
  {
    "id": "presentation-foundation",
    "name": "Presentation platform",
    "order": 2,
    "taskIds": [
      "UI-001",
      "UI-002",
      "UI-003",
      "UI-010"
    ]
  }
]
```

---

# 5. Generated owner-facing documents

The following Markdown files must be generated from the canonical JSON files.
Agents must not maintain conflicting status manually.

## 5.1 `ROADMAP.md`

Must show:

- every phase;
- every task;
- status;
- priority;
- owner;
- dependencies;
- tasks unlocked;
- phase progress;
- blocked tasks.

Example:

```text
Phase: Renderer Foundation — 75%

✅ TIKTOK-010  Normalize render job
✅ TIKTOK-020  Template engine router
🔎 TIKTOK-030  Template manifest constraints
🛠 TIKTOK-050  Strategy registry

Blocked: none
Next recommended task: TIKTOK-030 review
```

## 5.2 `PROJECT_STATUS.md`

Must answer within five minutes:

- What is the current overall progress?
- Which phase is active?
- What is being worked on?
- What is waiting for review?
- What is blocked?
- What was recently completed?
- What is the next recommended task?
- What are the top current risks?

Required sections:

```text
Overall progress
Active phase
In progress
In review
Blocked
Recently verified
Next recommended task
Top risks
Release readiness
Last generated timestamp
```

## 5.3 `CAPABILITY_MATRIX.md`

Must show business/product capability, not source implementation details.

Example:

| Area | Capability | Status | Evidence | Human check |
|---|---|---:|---|---|
| Renderer | Legacy render | Verified | PR #... | Passed |
| Renderer | Engine routing | Available | PR #27 | Not required |
| Templates | Adaptive layout | Not started | — | Required |
| Retention | Quiz reveal | Not started | — | Required |
| Admin UI | Preview template | Not started | — | Required |

## 5.4 `RISK_REGISTER.md`

Minimum fields:

- risk ID;
- description;
- probability;
- impact;
- mitigation;
- owner;
- status;
- affected tasks.

Initial known risks should include:

- Agents implementing dependent tasks concurrently;
- hardcoded template behavior;
- legacy regression;
- missing visual evidence;
- long-content overflow;
- template activation without preview;
- roadmap and GitHub Project becoming inconsistent.

---

# 6. Pull Request evidence contract

Create `.github/PULL_REQUEST_TEMPLATE.md`.

Every PR must include:

```markdown
## Task
Task ID:
Issue:

## Requirement completed
Explain in product language.

## Acceptance criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Changes
List files and responsibilities, not only filenames.

## Tests
Commands:
Results:
New tests:

## Backward compatibility
Explain evidence.

## Architecture compliance
- [ ] No template ID hardcoded in shared core
- [ ] No strategy ID hardcoded in shared core
- [ ] No unrelated behavior modified
- [ ] Existing API compatibility preserved
- [ ] Existing tests pass

## Evidence
- [ ] Test report
- [ ] Payload example
- [ ] Screenshot
- [ ] Preview MP4
- [ ] ffprobe output
- [ ] Architecture review

Use N/A with explanation where evidence type is irrelevant.

## Risks and limitations

## Rollback plan

## Reviewer decision
- [ ] APPROVE
- [ ] REQUEST CHANGES
- [ ] REJECT
```

The governance check must fail when required sections are absent.

---

# 7. Issue template contract

Create an implementation-task Issue template containing:

- Task ID;
- Goal;
- Product outcome;
- Scope;
- Out of scope;
- Dependencies;
- Tasks unlocked;
- Acceptance criteria;
- Required tests;
- Required evidence;
- Risk;
- Human verification instructions;
- Definition of Done.

Do not allow vague tasks such as:

```text
Improve template system
```

A valid task must be objectively reviewable.

---

# 8. Delivery lifecycle

Create `DELIVERY_PROCESS.md` with this lifecycle:

```text
Backlog
  -> Ready
  -> In Progress
  -> In Review
  -> Merged
  -> Verified
  -> Released
```

## Definition of Ready

A task is Ready only when:

- goal is clear;
- scope and out-of-scope are written;
- dependencies are satisfied;
- acceptance criteria are objective;
- required evidence is defined;
- test expectations are defined;
- file ownership conflict is checked.

## Definition of Done

A task is Done/Verified only when:

- implementation is merged;
- acceptance criteria are proven;
- required tests pass;
- backward compatibility is proven;
- required evidence is attached;
- Reviewer Agent approves;
- project data is updated;
- capability status is updated;
- owner can perform the documented human check;
- no unresolved critical blocker exists.

`Merged` and `Verified` must remain separate statuses.

---

# 9. Agent roles

Create `AGENT_RULEBOOK.md`.

## 9.1 Orchestrator Agent

Responsibilities:

- inspect current repository and GitHub task state;
- update canonical task registry;
- calculate dependencies;
- select the next eligible task;
- avoid concurrent overlapping work;
- assign tasks;
- ensure review occurs;
- update status after merge and verification.

The Orchestrator must never mark its own implementation as approved.

## 9.2 Developer Agent

Responsibilities:

- implement exactly one assigned task;
- run baseline tests first;
- submit impact plan;
- write tests;
- submit evidence;
- not self-approve;
- not change unrelated architecture.

## 9.3 Reviewer Agent

Responsibilities:

- review independently;
- compare implementation against acceptance criteria;
- inspect hardcoding, duplication, compatibility, test quality, and security;
- run relevant tests;
- issue one decision:
  - APPROVE;
  - REQUEST CHANGES;
  - REJECT.

Reviewer must not quietly fix the implementation while reviewing.

## 9.4 QA / Visual Reviewer Agent

For render/UI tasks:

- run fixture set;
- produce preview MP4;
- capture representative frames;
- run `ffprobe`;
- inspect overflow, safe zones, missing assets, timing, and readability;
- provide evidence report.

## 9.5 Human Project Owner

The owner verifies product-level evidence:

- Does the demo behave as expected?
- Is text readable?
- Does legacy behavior still work?
- Is the new capability visible?
- Can rollback be performed?
- Does the evidence match the ticket?

The owner is not expected to read all source code.

---

# 10. Automation scripts

## 10.1 Validate project data

`scripts/governance/validate-project-data.mjs` must:

- validate all JSON against schemas;
- detect duplicate task IDs;
- detect unknown dependencies;
- detect circular dependencies;
- detect task references to unknown capabilities;
- ensure completed tasks have completion timestamps;
- ensure verified capabilities have evidence.

Non-zero exit code on failure.

## 10.2 Generate documents

Scripts must deterministically generate:

- ROADMAP.md;
- PROJECT_STATUS.md;
- CAPABILITY_MATRIX.md.

Generated files must include:

```text
<!-- GENERATED FILE — DO NOT EDIT MANUALLY -->
```

## 10.3 PR evidence check

`check-pr-evidence.mjs` must validate required PR template sections using the PR
body provided by GitHub Actions.

It should not decide whether evidence is true, only whether mandatory evidence
fields are present.

---

# 11. GitHub Action

Create `.github/workflows/governance-check.yml`.

Run on:

- Pull Request opened;
- Pull Request edited;
- Pull Request synchronize;
- push to main.

Required checks:

1. validate project JSON;
2. generate governance docs;
3. fail if generated docs differ from committed docs;
4. validate PR evidence sections on Pull Requests;
5. run existing repository lint/tests/build where appropriate.

Do not add secret requirements for these checks.

---

# 12. Initial repository inventory

Before generating the first status files, the Agent must inspect:

- existing GitHub Issues;
- open Pull Requests;
- merged Pull Requests related to current TikTok tasks;
- `.openclaw` planning files if present;
- current renderer/template documentation;
- current GitHub Project statuses.

At minimum, inventory these known task IDs if present:

```text
TIKTOK-010
TIKTOK-020
TIKTOK-030
TIKTOK-050
UI-001
UI-002
UI-003
UI-010
UI-011
UI-012
UI-020
UI-021
UI-022
RET-001
RET-002
RET-003
RET-004
ADMIN-001
ADMIN-002
ADMIN-003
ADMIN-004
QA-001
QA-002
QA-003
```

Do not assume a task is complete merely because a Pull Request is merged.

Use:

- `merged` when code merged;
- `verified` only after acceptance evidence exists;
- `released` only after deployment/release evidence exists.

---

# 13. Owner review format

`REVIEW_CHECKLIST.md` must let the owner review a task in five minutes.

Required checklist:

```markdown
# Five-minute owner review

## 1. What changed?
One product-language paragraph.

## 2. How do I verify it?
Exact steps or demo link.

## 3. What result should I see?
Expected visible result.

## 4. Did old behavior still work?
Evidence link/result.

## 5. What could go wrong?
Known risks and limitations.

## 6. Can it be rolled back?
Exact rollback path.

## Decision
- [ ] Accept product verification
- [ ] Return for changes
- [ ] Need technical reviewer clarification
```

---

# 14. Progress calculation

Progress must be calculated from canonical task statuses.

Recommended weights:

```text
backlog       0
ready         0
in_progress  25
in_review    50
merged       75
verified    100
released    100
blocked      retain previous earned progress but flag separately
cancelled    excluded
```

Also show:

- task completion percentage;
- verified capability percentage;
- phase progress;
- number of blocked tasks.

Do not present a single overall percentage without the verified-capability metric.

---

# 15. Initial capabilities

Seed `capabilities.json` with at least:

## Renderer

- legacy rendering;
- normalized render-job adapter;
- template engine routing;
- template-defined constraints;
- strategy registry;
- adaptive layout;
- scene-v2 compiler;
- artifact QA.

## Template platform

- component registry;
- animation registry;
- design tokens;
- presentation schema;
- template preview;
- template activation;
- template rollback.

## TikTok retention

- classic definition;
- quiz reveal;
- mistake correction;
- pronunciation challenge;
- deterministic strategy selection.

## Admin UI

- template list;
- template editor;
- preview interface;
- lifecycle management.

Each capability must reflect actual evidence. Unknown work begins as
`not_started` or `partial`, never automatically `available`.

---

# 16. Acceptance criteria for PROJECT-001

The task is complete only when:

1. All required files exist.
2. Canonical JSON files pass schema validation.
3. No circular or unknown dependency exists.
4. ROADMAP.md is generated from task data.
5. PROJECT_STATUS.md is generated from task data.
6. CAPABILITY_MATRIX.md is generated from capability data.
7. GitHub PR template requires evidence.
8. GitHub Issue templates require acceptance criteria.
9. Governance GitHub Action passes.
10. Existing product behavior is unchanged.
11. Existing lint/tests/build still pass.
12. At least one existing merged task is represented as `merged`.
13. At least one task awaiting evidence remains `in_review` or `merged`, not
    incorrectly `verified`.
14. The owner can identify current progress, blocked tasks, capabilities, risks,
    and next task by opening PROJECT_STATUS.md and CAPABILITY_MATRIX.md.
15. Reviewer Agent produces an independent review report.

---

# 17. Required completion evidence

The implementation PR must attach or include:

- generated ROADMAP.md;
- generated PROJECT_STATUS.md;
- generated CAPABILITY_MATRIX.md;
- dependency validation output;
- governance-action result;
- existing test/lint/build results;
- example Issue created from the template;
- example PR body using the evidence contract;
- reviewer report;
- statement confirming no product runtime behavior changed.

---

# 18. Execution instructions for OpenClaw

The Orchestrator must perform this exact sequence:

1. Read this file completely.
2. Inspect repository governance files already present.
3. Inventory existing Issues and Pull Requests.
4. Write an impact plan.
5. Create or update one Issue named:
   `PROJECT-001: Engineering governance and delivery dashboard`.
6. Create one implementation branch.
7. Implement only PROJECT-001.
8. Run existing baseline tests.
9. Run new governance validation.
10. Open one Pull Request.
11. Assign an independent Reviewer Agent.
12. Do not merge until the Reviewer returns APPROVE.
13. After merge, regenerate project status.
14. Keep task status as `merged` until the owner accepts the five-minute review.
15. After owner acceptance, update status to `verified`.

---

# 19. Prompt to start the Orchestrator

Use this instruction after adding the file to the repository:

```text
Read PROJECT-001_ENGINEERING_GOVERNANCE.md completely.

Inspect the current repository, existing GitHub Issues, merged/open Pull Requests,
GitHub Project status, and existing .openclaw planning documents.

Implement PROJECT-001 only.

Do not implement renderer, presentation, template, retention, UI, publishing, or
n8n features in this task.

Create the canonical task/capability registry, generated owner dashboard,
evidence-based PR/Issue templates, validation scripts, and governance CI exactly
as specified.

Do not mark any existing task verified unless evidence supports it.
Require an independent Reviewer Agent before merge.
```
