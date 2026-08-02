# Multi-Agent Coordination

## Roles

### Orchestrator
- reads master plan and task graph;
- checks dependencies;
- assigns one task per worker branch;
- prevents concurrent edits to overlapping core files;
- requests reviewer approval.

### Architecture agent
- validates boundaries and compatibility;
- maintains ADRs;
- does not implement feature code unless assigned.

### Renderer worker
- changes renderer code and tests;
- follows one task contract.

### Template worker
- creates manifests, strategies, fixtures and template packages;
- cannot add template-specific branches to renderer core.

### QA reviewer
- reviews diff;
- runs regression and negative tests;
- rejects hardcoding and missing compatibility evidence.

## File ownership locking

Tasks touching `renderer/src/render.mjs` or future engine/router modules must not
run concurrently unless explicitly marked safe by the orchestrator.
