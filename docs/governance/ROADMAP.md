<!-- GENERATED FILE — DO NOT EDIT MANUALLY -->

# Roadmap

## Renderer Foundation — 54%

- ◐ **TIKTOK-000** Baseline and architecture inventory — merged; priority: medium; owner: UNASSIGNED; depends on: none; unlocks: TIKTOK-010
- ◐ **TIKTOK-010** Extract normalized render job model — merged; priority: medium; owner: UNASSIGNED; depends on: TIKTOK-000; unlocks: TIKTOK-020, TIKTOK-030, TIKTOK-050, TIKTOK-120
- ◐ **TIKTOK-020** Add template engine router — merged; priority: medium; owner: UNASSIGNED; depends on: TIKTOK-010; unlocks: TIKTOK-060, TIKTOK-070
- ◐ **TIKTOK-030** Move content constraints into template manifests — merged; priority: medium; owner: UNASSIGNED; depends on: TIKTOK-010; unlocks: TIKTOK-040
- ○ **TIKTOK-040** Implement adaptive text layout resolver — backlog; priority: high; owner: UNASSIGNED; depends on: TIKTOK-030; unlocks: TIKTOK-080
- ◐ **TIKTOK-050** Create strategy registry and classic strategy — merged; priority: medium; owner: UNASSIGNED; depends on: TIKTOK-010; unlocks: TIKTOK-060, TIKTOK-120, RET-004
- ○ **TIKTOK-060** Add template capabilities and strategy compatibility — backlog; priority: medium; owner: UNASSIGNED; depends on: TIKTOK-020, TIKTOK-050; unlocks: TIKTOK-070, UI-001

Blocked: none

## Scene Engine — 0%

- ○ **TIKTOK-070** Build minimal scene-v2 compiler — backlog; priority: high; owner: UNASSIGNED; depends on: TIKTOK-020, TIKTOK-060; unlocks: TIKTOK-080, TIKTOK-100, TIKTOK-110, TIKTOK-130
- ○ **TIKTOK-080** Create scene-v2 pastel parity template — backlog; priority: medium; owner: UNASSIGNED; depends on: TIKTOK-040, TIKTOK-070; unlocks: TIKTOK-090

Blocked: none

## Template Lifecycle — 0%

- ○ **TIKTOK-110** Implement template validate-preview-activate lifecycle — backlog; priority: high; owner: UNASSIGNED; depends on: TIKTOK-070; unlocks: ADMIN-001

Blocked: none

## Presentation Foundation — 0%

- ○ **UI-001** Define presentation schema — backlog; priority: medium; owner: UNASSIGNED; depends on: TIKTOK-060; unlocks: UI-002, UI-003
- ○ **UI-002** Create component registry — backlog; priority: medium; owner: UNASSIGNED; depends on: UI-001; unlocks: UI-010
- ○ **UI-003** Add design-token system — backlog; priority: medium; owner: UNASSIGNED; depends on: UI-001; unlocks: UI-010
- ○ **UI-010** Build presentation tree — backlog; priority: medium; owner: UNASSIGNED; depends on: UI-002, UI-003; unlocks: UI-011
- ○ **UI-011** Build scene-v2 compiler — backlog; priority: medium; owner: UNASSIGNED; depends on: UI-010; unlocks: UI-012, RET-002, RET-003
- ○ **UI-012** Build pastel scene-v2 parity template — backlog; priority: medium; owner: UNASSIGNED; depends on: UI-011; unlocks: UI-020

Blocked: none

## Adaptive Layout — 0%

- ○ **UI-020** Template-defined overflow policies — backlog; priority: medium; owner: UNASSIGNED; depends on: UI-012; unlocks: UI-021
- ○ **UI-021** Adaptive typography — backlog; priority: medium; owner: UNASSIGNED; depends on: UI-020; unlocks: UI-022
- ○ **UI-022** Split-scene support — backlog; priority: medium; owner: UNASSIGNED; depends on: UI-021; unlocks: RET-001

Blocked: none

## Retention Formats — 0%

- ○ **TIKTOK-090** Add quiz-reveal TikTok strategy and template — backlog; priority: medium; owner: UNASSIGNED; depends on: TIKTOK-080; unlocks: none
- ○ **TIKTOK-100** Add mistake-correction strategy — backlog; priority: medium; owner: UNASSIGNED; depends on: TIKTOK-070; unlocks: none
- ○ **RET-001** Quiz Reveal — backlog; priority: medium; owner: UNASSIGNED; depends on: UI-022; unlocks: none
- ○ **RET-002** Mistake Correction — backlog; priority: medium; owner: UNASSIGNED; depends on: UI-011; unlocks: none
- ○ **RET-003** Pronunciation Challenge — backlog; priority: medium; owner: UNASSIGNED; depends on: UI-011; unlocks: none
- ○ **RET-004** Deterministic strategy selector — backlog; priority: medium; owner: UNASSIGNED; depends on: TIKTOK-050; unlocks: none

Blocked: none

## Admin Ui — 0%

- ○ **ADMIN-001** Template list UI — backlog; priority: medium; owner: UNASSIGNED; depends on: TIKTOK-110; unlocks: ADMIN-002
- ○ **ADMIN-002** Template editor UI — backlog; priority: medium; owner: UNASSIGNED; depends on: ADMIN-001; unlocks: ADMIN-003
- ○ **ADMIN-003** Preview UI — backlog; priority: medium; owner: UNASSIGNED; depends on: ADMIN-002; unlocks: ADMIN-004
- ○ **ADMIN-004** Template lifecycle APIs — backlog; priority: medium; owner: UNASSIGNED; depends on: ADMIN-003; unlocks: none

Blocked: none

## Experiments And Qa — 0%

- ○ **TIKTOK-120** Persist experiment and render metadata — backlog; priority: medium; owner: UNASSIGNED; depends on: TIKTOK-010, TIKTOK-050; unlocks: none
- ○ **TIKTOK-130** Add automated artifact QA — backlog; priority: medium; owner: UNASSIGNED; depends on: TIKTOK-070; unlocks: none
- ○ **QA-001** PR evidence report — ready; priority: medium; owner: UNASSIGNED; depends on: none; unlocks: QA-002, QA-003
- ○ **QA-002** Visual evidence — backlog; priority: medium; owner: UNASSIGNED; depends on: QA-001; unlocks: none
- ○ **QA-003** Architecture reviewer gate — ready; priority: medium; owner: UNASSIGNED; depends on: QA-001; unlocks: none

Blocked: none
