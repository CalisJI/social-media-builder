# Engineering governance

`project/tasks.json`, `project/capabilities.json`, and `project/phases.json` are the canonical registries. Generated documents must not be edited by hand.

## Commands

- `npm run governance:validate` validates schemas, references, dependency cycles, completion timestamps, and verified-capability evidence.
- `npm run governance:generate` deterministically refreshes the owner dashboard.

## Operating rule

A merged PR is not verified delivery. Keep the task `merged` until evidence is accepted by an independent reviewer and the owner completes the five-minute review.
