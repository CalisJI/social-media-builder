# Audio, Motion, and Asset System

## Audio is product-critical

A technically present but nearly inaudible track is a failed result. The renderer must treat audio as a designed timeline with measurable quality.

## Audio track model

- `voice`: pronunciation, narration, or TTS.
- `music`: background mood.
- `sfx`: countdown, reveal, CTA, transitions.

## Audio preset

A preset defines:

- asset IDs;
- gain targets;
- ducking parameters;
- fades;
- cue timing;
- fallback behavior;
- licensing metadata.

## Required audio gates

- audio stream exists;
- required voice asset exists;
- duration aligns with scene;
- voice is above minimum loudness;
- music does not mask speech;
- true peak does not clip;
- excessive silence is detected;
- file decoding succeeds;
- production artifact includes expected audio codec.

## Asset catalog

All visual and audio assets must be cataloged. Required metadata:

- ID and version;
- type;
- file location;
- tags;
- style tags;
- license/source notes;
- allowed commercial use flag;
- dimensions/duration;
- checksum;
- approval state;
- attribution requirement.

## Initial asset groups

- educational abstract backgrounds;
- neutral gradients and textures;
- countdown elements;
- pronunciation waveform;
- success/reveal effects;
- CTA effects;
- approved icons;
- music beds;
- short SFX;
- brand marks.

## Asset policy

- Do not fetch random network assets during production render.
- Ingest, validate, and approve assets before use.
- Do not bundle unverified licenses.
- Missing assets must fail validation or use a declared approved fallback.
- Agent-generated or external assets require provenance.

## Motion system

Motion must be reusable presets rather than scattered frame math.

Each preset defines:

- enter/hold/exit phases;
- duration;
- easing;
- opacity/position/scale/rotation bounds;
- stagger behavior;
- reduced-motion behavior;
- allowed node types.

## Motion quality rules

- motion reinforces hierarchy;
- no more than a small number of competing focal motions;
- text remains readable during motion;
- no accidental dead time;
- no animation ends outside its intended state;
- transitions have a stable final frame;
- repeated templates may use seeded variation, but render must remain reproducible.

