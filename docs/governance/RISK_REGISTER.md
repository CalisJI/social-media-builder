# Risk register

| ID | Description | Probability | Impact | Mitigation | Owner | Status | Affected tasks |
|---|---|---|---|---|---|---|---|
| R-001 | Dependent tasks are implemented concurrently. | Medium | High | Orchestrator checks dependency graph and file ownership before assignment. | Orchestrator | Open | All |
| R-002 | Shared core hardcodes template behavior. | Medium | High | Reviewer rejects template-ID branches in shared core. | Reviewer | Open | TIKTOK-060, UI-001 |
| R-003 | Legacy rendering regresses. | Medium | High | Require legacy regression evidence before verification. | Developer | Open | Renderer tasks |
| R-004 | Visual evidence is missing. | Medium | Medium | Require preview, frames, and ffprobe for render/UI changes. | QA reviewer | Open | UI, RET, ADMIN |
| R-005 | Long content overflows. | High | Medium | Stress fixtures and declared overflow policies. | Developer | Open | TIKTOK-040, UI-020 |
| R-006 | A template activates without preview. | Medium | High | Lifecycle gate prevents activation until preview succeeds. | Developer | Open | TIKTOK-110, ADMIN-004 |
| R-007 | Roadmap and GitHub Project diverge. | Medium | Medium | Generate dashboard from registry; resolve project status before updates. | Orchestrator | Open | All |
