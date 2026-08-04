# Reference Image to Template Workflow

## Goal

Allow a user to provide a reference image, receive a generated video-template candidate, preview it, and save an accepted version to the reusable library.

## Important limitation

The system should derive **design characteristics**, not reproduce protected brand assets or create a pixel-identical copy. The output should be an original template inspired by layout, palette, spacing, hierarchy, and mood.

## User flow

```text
Upload reference image
        ↓
Crop / choose relevant region
        ↓
Analyze visual properties
        ↓
Generate structured Design Analysis
        ↓
Map analysis to supported tokens/primitives
        ↓
Generate candidate Template DSL
        ↓
Validate and compile
        ↓
Render with sample content
        ↓
User accepts, requests revision, or rejects
        ↓
Accepted candidate becomes immutable library version
```

## Analysis output

The image-analysis service should produce structured, confidence-scored data:

- dominant and supporting colors;
- background treatment;
- composition/grid;
- focal point;
- spacing density;
- card/shape geometry;
- corner radius style;
- shadow/elevation style;
- typography category and hierarchy;
- text alignment;
- icon/illustration style;
- visual mood tags;
- contrast risks;
- likely motion interpretation;
- unsupported elements.

It must not return arbitrary CSS as the authoritative result.

## Mapping stage

Map extracted properties to the nearest supported:

- design tokens;
- font registry entries;
- node primitives;
- motion presets;
- asset styles;
- layout variants.

Unsupported details are recorded as warnings and replaced with safe equivalents.

## Candidate generation

The candidate generator receives:

- design analysis;
- target content type;
- platform profile;
- template capability catalog;
- sample content;
- brand constraints.

It outputs a `CreativePlan` and candidate template.

## Preview requirements

Before user acceptance, render:

- one normal sample;
- one long-text stress sample;
- optionally the user's real content.

Show:

- video preview;
- extracted palette;
- editable safe controls;
- warnings;
- template name and tags;
- revision history.

## User decisions

### Accept

- candidate transitions to accepted template version;
- provenance stores reference image hash, analysis version, generator version, and user decision;
- template becomes selectable in future renders.

### Revise

User may request controlled changes:

- lighter/darker;
- more/less motion;
- larger text;
- different accent;
- alternate background;
- remove decoration;
- adjust scene density.

The system creates a new candidate revision.

### Reject

Candidate remains stored only as a rejected draft for diagnostics or is deleted according to retention policy.

## Phase sequencing

Phase 1 must prepare the data model and library hooks but does not need fully automatic image extraction before the TikTok Gold Standard module ships.

Recommended order:

1. Manually authored template saved through the same candidate/approval/library pipeline.
2. Rule-assisted reference-image analysis.
3. AI-assisted generation constrained by schemas.
4. Improved scoring and revision loop.

This avoids delaying the first publish-ready video.

