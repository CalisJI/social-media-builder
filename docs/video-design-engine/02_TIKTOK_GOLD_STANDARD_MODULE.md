# TikTok Gold Standard Module

## Objective

Deliver the earliest visible proof that Social Media Builder can create compelling video. This module is the mandatory fast track and must not be delayed by later platform work.

## Module name

`TikTok Vocabulary Challenge — Gold Standard v1`

## Output contract

- Aspect ratio: 9:16.
- Resolution: 1080×1920.
- Frame rate: 30 fps by default.
- Duration: configurable from 10 to 15 seconds; default 12 seconds.
- Video codec: H.264.
- Audio codec: AAC.
- Audio stream: required.
- Safe area: template-defined with TikTok UI overlays considered.
- Output: preview and production profiles.

## Content contract

Required:

- `word`
- `meaningVi`
- `exampleEn`
- `exampleVi`
- `ipa` or pronunciation asset

Optional:

- `partOfSpeech`
- `contextTopic`
- `hook`
- `cta`
- `illustrationQuery`
- `brandId`

See `schemas/content.schema.json`.

## Scene plan

The exact timing may adapt, but the semantic stages are fixed for v1.

### Scene 1 — Hook, 0.0–1.4 s

Purpose: stop the scroll.

Requirements:

- large motion-led question or challenge;
- one focal point;
- no paragraph text;
- subtle background motion begins immediately;
- short hook SFX;
- minimum 250 ms stable reading window.

Suggested messages:

- “Can you pronounce this?”
- “Do you know this word?”
- “3 seconds. Say it aloud.”

The renderer chooses from localized copy or user-provided text; no word-specific hardcoding.

### Scene 2 — Word challenge, 1.4–4.2 s

- word displayed prominently;
- optional part-of-speech badge;
- animated countdown or progress indicator;
- countdown tick sound;
- word remains stable enough to read;
- decorative assets must not compete with the word.

### Scene 3 — Pronunciation reveal, 4.2–6.2 s

- pronounced word voice clip;
- IPA and syllable emphasis;
- visual reveal animation;
- success/pop SFX;
- music ducks beneath voice;
- replay icon may appear, but is not interactive in exported video.

### Scene 4 — Meaning, 6.2–8.6 s

- Vietnamese meaning is the second-largest information element;
- critical phrase may be highlighted;
- illustration or abstract semantic asset may enter;
- layout adapts to two–four lines;
- no meaning is truncated silently.

### Scene 5 — Example, 8.6–11.0 s

- English example appears first;
- Vietnamese example appears as support;
- keyword is highlighted consistently;
- text is revealed in one or two controlled steps;
- if content cannot fit, use a supported split strategy, not microscopic text.

### Scene 6 — CTA/end card, 11.0–12.0 s

- clear channel-level action;
- logo or brand mark;
- short CTA chime;
- intentional held final frame for at least 350 ms;
- no essential element under platform UI overlays.

## Visual direction for v1

The first template may use a polished education/pastel visual system, but implementation must be tokenized.

Required characteristics:

- high-contrast primary word;
- restrained palette with one dominant accent and one secondary accent;
- consistent rounded geometry;
- intentional depth through shadows or layers, not random decoration;
- large typographic hierarchy;
- no unused “dead” central area;
- decorative motion limited to a small number of coordinated elements;
- every scene must feel like the same brand.

## Typography rules

- Only fonts in the approved font registry.
- Vietnamese glyph coverage is mandatory.
- Preferred size, minimum size, max lines, box bounds, and overflow strategy are required for every text node.
- Long text strategy order:
  1. wrap;
  2. balanced line breaks;
  3. modest font reduction;
  4. supported layout variant;
  5. scene split;
  6. explicit validation failure.
- Silent clipping and uncontrolled ellipsis are forbidden for educational content.

## Motion rules

Use named motion presets. Phase 1 presets:

- `hook-rise`
- `word-focus`
- `countdown-pulse`
- `pronunciation-reveal`
- `meaning-slide`
- `example-highlight`
- `cta-pop`

Each preset defines duration, easing, delay, overshoot limits, and exit behavior. Templates may select or parameterize presets but may not embed arbitrary animation code.

## Audio rules

Required tracks:

- pronunciation/voice;
- background music or an explicitly approved no-music preset;
- countdown ticks;
- reveal SFX;
- CTA SFX.

Required processing:

- gain normalization;
- voice priority;
- music ducking while voice plays;
- fade-in/fade-out;
- peak and loudness checks;
- missing-file validation.

## Fast-track deliverables

1. Design specification and representative still mockups.
2. One template definition using the initial Template DSL.
3. Generic primitives required by the template.
4. Audio preset and asset manifest.
5. Four fixtures:
   - short;
   - normal;
   - long word;
   - long bilingual content.
6. Preview flow.
7. User acceptance action.
8. Save-to-library action.
9. Independent review evidence.
10. One owner-approved publish-ready MP4.

## Definition of done

This module is complete only when:

- the owner explicitly accepts a produced video;
- the accepted template version is stored in the library;
- a second vocabulary item renders through the same saved template without code modification;
- the independent reviewer submits an official approval on the current head commit;
- production render passes all gates in `09_PRODUCTION_QUALITY_GATES.md`.

