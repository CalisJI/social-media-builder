# TEMPLATE-DEFAULT-001 — Implement TikTok Vocab Template V2 as the default

Repository: `CalisJI/social-media-builder`

Reference image:

```text
references/tiktok-vocab-template-v2-reference.png
```

## Interpretation rule

The image is a visual target only. Do not copy sample vocabulary, numbering, placeholder channel names, infographic annotations outside the phone frame, or accidental text mistakes.

Implement only the vertical 9:16 phone-frame design.

## Goal

Create a production-ready TikTok vocabulary template and make it the default after validation and preview, while preserving the old template for rollback.

Use:

```text
template_id: vocabulary-neon-focus-v1
engine: scene-v2
strategy default: classic-definition-v1
platform: tiktok
resolution: 1080x1920
aspect ratio: 9:16
```

If `scene-v2` is not ready, implement with the safest current engine, keep all visual configuration inside the template package, avoid template-ID-specific branches in shared core, and open a follow-up migration task.

## Visual zones

1. Top bar: series badge left, optional sequence number right.
2. Hero word: very large, centered, white with subtle cyan-magenta glow.
3. Pronunciation: IPA, optional audio indicator, POS neon badge.
4. Meaning card: dark translucent surface, neon border, yellow emphasized meaning.
5. Example card: `EXAMPLE` label, English sentence, target word highlight, Vietnamese translation.
6. CTA card: short, centered, gradient emphasis.
7. Footer: brand handle and subtle waveform/decorative line.

## Design tokens

Suggested palette:

```json
{
  "background": "#050816",
  "surface": "#0B1028",
  "surfaceStrong": "#11173A",
  "textPrimary": "#FFFFFF",
  "textSecondary": "#C7CAE0",
  "accentCyan": "#24D9FF",
  "accentBlue": "#5576FF",
  "accentPurple": "#8B5CFF",
  "accentMagenta": "#FF4FA3",
  "accentYellow": "#FFD84A"
}
```

Suggested typography roles:

```json
{
  "heroWord": {"weight": 800, "preferredSize": 112, "minimumSize": 66},
  "ipa": {"weight": 500, "preferredSize": 42, "minimumSize": 32},
  "meaning": {"weight": 700, "preferredSize": 48, "minimumSize": 34},
  "exampleEnglish": {"weight": 600, "preferredSize": 40, "minimumSize": 30},
  "exampleVietnamese": {"weight": 400, "preferredSize": 32, "minimumSize": 26},
  "cta": {"weight": 700, "preferredSize": 34, "minimumSize": 28}
}
```

Use only fonts already allowed by the repository unless a separate licensed-font task is approved.

## Timeline

Target: 10 seconds default, 8–12 seconds supported.

Suggested sequence:

```text
0.0–1.0   identity/hook
0.4–2.4   hero word
1.3–3.2   IPA + POS
2.3–5.3   meaning card
4.7–8.1   example card
7.7–9.4   CTA
0.0–10.0  subtle background/footer motion
```

Motion must be restrained: fade, rise, subtle scale/glow. No rapid flashing.

## Adaptive layout

Required policies:

```text
hero word: shrink -> two-line alternate -> error
meaning: wrap -> shrink -> alternate layout -> split scene -> error
example: wrap -> shrink -> alternate layout -> split scene -> error
CTA: wrap -> shrink -> error
```

Do not silently truncate educational content. Keep source content unchanged.

## Template package

Create:

```text
templates/vocabulary-neon-focus-v1/
├── manifest.json
├── theme.json
├── presentation.json or scenes.json
├── schema.json
├── README.md
├── fixtures/
└── assets/
```

Manifest must declare ID, engine, schema version, strategies, capabilities, constraints, lifecycle, version, platform, and aspect ratio.

Suggested capabilities:

```json
{
  "classicDefinition": true,
  "progressBar": true,
  "adaptiveText": true,
  "splitScene": true,
  "pronunciationAudio": true,
  "quizReveal": false,
  "wrongRight": false
}
```

Claim only capabilities that are implemented and tested.

## Make default safely

Do not delete or overwrite the old template.

Required sequence:

```text
create -> validate -> preview fixtures -> visual QA -> previewed -> activate -> preserve rollback
```

Default selection must come from centralized registry/configuration, not scattered hardcoded template IDs.

After activation:

- requests without `template_id` use `vocabulary-neon-focus-v1`;
- explicit requests for the old template still work;
- rollback restores the old default without code rewrite.

## Required fixtures

Render at least:

1. `absorb` — normal content.
2. `suspenseful` — long word.
3. `crunch` — long Vietnamese meaning.
4. `resilient` — short example.
5. Missing IPA.
6. Missing Vietnamese example.
7. Long CTA.
8. Very long valid meaning requiring adaptive layout or split scene.
9. Vietnamese diacritics stress case.

Each fixture must include input payload, resolved template/strategy, warnings, MP4, screenshots, and `ffprobe` output.

## Technical acceptance criteria

- No template ID hardcoded in shared renderer core.
- No strategy ID hardcoded in shared renderer core.
- No arbitrary JavaScript from template files.
- Unsafe asset paths rejected.
- Legacy tests pass.
- Template validation and fixture renders pass.
- Build and lint pass.
- Default selection and explicit legacy selection are tested.
- Rollback is documented and tested.
- Constraints are manifest-driven.
- Source educational content remains unchanged.

## Human acceptance criteria

Owner can verify without reading source:

- design visually resembles the reference;
- text is readable on a phone;
- no overlaps;
- long meanings render without losing source content;
- old explicit template still works;
- no-template requests use the new default;
- rollback works.

## PR evidence

Include reference image, package tree, before/after screenshots, at least three preview MP4s, long-content evidence, tests, default-selection evidence, legacy-selection evidence, rollback steps, and independent Reviewer Agent decision.

Do not mark `verified` until Owner visual approval is recorded.

## Orchestrator prompt

```text
Read task/TEMPLATE-DEFAULT-001.md completely.

Use references/tiktok-vocab-template-v2-reference.png as the visual reference.
Implement only the vertical 9:16 phone-frame design. Do not copy infographic annotations, sample numbering, placeholder channel names, or accidental text mistakes.

Create vocabulary-neon-focus-v1 as a versioned template package, preserve the current default for rollback, validate and preview all required fixtures, and open one PR with visual evidence.

Do not hardcode this template ID in shared renderer core. Select and activate the default through centralized registry/configuration.

Do not mark the task verified until an independent Reviewer Agent approves and the Owner completes visual verification.
```
