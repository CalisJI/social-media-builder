# Agent Orchestration and Governance

## Roles

### Product Owner

- defines publishable quality;
- accepts or rejects candidate template previews;
- resolves product tradeoffs;
- authorizes merge/release.

### Architecture Agent

- reviews module boundaries and contracts;
- maintains architecture decisions;
- prevents premature generalization;
- does not implement routine tasks unless assigned separately.

### Visual Design Agent

- creates scene specification, style tokens, mockups, and motion/audio direction;
- works within supported primitives;
- does not modify renderer source unless explicitly acting as implementation agent.

### Implementation Agent

- claims tasks with satisfied dependencies;
- changes code and tests;
- renders evidence;
- pushes to the assigned branch/PR;
- never approves or merges its own PR.

### Independent Reviewer App/Agent

- reads the current PR and acceptance criteria;
- independently inspects tests and artifacts;
- submits official `APPROVE`, `REQUEST_CHANGES`, or `COMMENT` using a separate GitHub identity;
- never modifies implementation code;
- never merges.

### QA Agent

- runs visual, audio, and technical gates;
- prepares contact sheets/reports;
- flags missing evidence;
- cannot override owner acceptance.

### Orchestrator Agent

- reads task graph;
- promotes only dependency-satisfied tasks;
- prevents duplicate ownership;
- maintains execution status;
- assigns specialist roles;
- stops work on blocked tasks;
- does not claim completion without evidence.

## Self-coordination protocol

1. Read all required documents.
2. Load `governance/tasks.json`.
3. Determine active phase from `governance/execution_manifest.yaml`.
4. Select the highest-priority unblocked task matching the agent role.
5. Record claim in repository execution-status document or issue tracker.
6. Inspect relevant existing code before editing.
7. Write an implementation plan.
8. Implement the minimum coherent change.
9. Run task-specific tests and evidence generation.
10. Update task status and attach evidence.
11. Open/update PR.
12. Wait for independent review.
13. On `REQUEST_CHANGES`, return task to in-progress and address every blocking item.
14. On approval and merge, unblock dependent tasks.

## Change control

Agents must not:

- start later phases to avoid fixing a blocked TikTok result;
- rewrite publishing integrations;
- create a second competing template engine;
- hide failures with hardcoded content;
- accept silent audio fallback;
- mark a template active without user acceptance;
- use the reviewer identity to create implementation PRs;
- use the implementation identity for official review.

## Evidence required in implementation reports

- task ID;
- files changed;
- reason for each file;
- tests executed and exact results;
- preview/production artifacts;
- sampled frame evidence where visual;
- audio report where audio-related;
- current PR head SHA;
- unresolved risks.

## Request-changes loop

```text
Reviewer REQUEST_CHANGES
        ↓
Orchestrator reopens affected task(s)
        ↓
Implementation agent reads full review
        ↓
Fix on existing PR branch
        ↓
Push new head SHA and evidence
        ↓
Reviewer re-runs review against new SHA
```

## Stop conditions

Stop and request owner input when:

- visual direction requires a product preference;
- a candidate preview is ready for acceptance;
- a proposed change would break publishing contracts;
- a licensed asset cannot be verified;
- two specifications conflict;
- architecture requires an irreversible migration.

