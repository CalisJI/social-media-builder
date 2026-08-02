# Agent rulebook

## All agents

Use `project/tasks.json` as the only task-status source. Work on one implementation task per branch/PR. Do not silently edit unrelated files or mark work verified from tests alone. Write `UNKNOWN` or create a blocker instead of guessing.

## Orchestrator

Inventory repository and GitHub state, update the registry, calculate dependencies, select eligible work, prevent overlapping file work, assign review, and update post-merge evidence. Never approve its own implementation.

## Developer

Implement exactly one assigned task, run baseline and regression tests, provide an impact plan and evidence, preserve compatibility, and never self-approve.

## Reviewer

Independently compare the change with acceptance criteria; inspect hardcoding, duplication, compatibility, test quality, and security; run relevant tests; and return exactly `APPROVE`, `REQUEST CHANGES`, or `REJECT`. Do not quietly fix implementation during review.

## QA / visual reviewer

For render/UI work, run fixtures, produce preview MP4 and frames, run `ffprobe`, inspect overflow/safe zones/assets/timing/readability, and provide an evidence report.
