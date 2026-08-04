# Fast-Track Scope Classification

## Decision
For the TikTok Gold Standard fast track, work is limited to the Video Design Engine sequence in `governance/tasks.json` through the Phase 1 release gate.

## Deferred work
The following is deferred until the fast-track release gate is accepted:

- renderer expansion not required by the current task graph;
- marketplace and plugin work;
- analytics and unrelated platform features;
- video-to-template work;
- re-auditing historic rendered videos.

## Protected work
Existing authentication, connected-account, scheduling, upload, and publishing flows remain unchanged. The fast track may only consume their established integration boundary for the later publishing smoke test.

## Promotion rule
A deferred item requires a separately claimed task after the Phase 1 release gate; it must not be added to an in-progress fast-track PR.
