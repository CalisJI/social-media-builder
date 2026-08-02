# Visual comparison — pastel legacy and scene-v2

The scene-v2 package intentionally keeps the legacy pastel visual vocabulary:
the full-bleed cloud background, cream 888×1150 card, drifting petal, lavender
IPA pill, rose part-of-speech accent, and the same staged hook → word → meaning
→ examples → CTA learning sequence.

## Approval criteria

- Both render at 1080×1920, 30 fps, H.264/yuv420p and hold final content through
  the end of the ten-second output.
- Essential text remains in the legacy safe zone (x=80..920, y=220..1500).
- The scene-v2 output preserves the legacy palette and relative hierarchy; it is
  acceptable for the first parity pass even though scene-v2's minimal primitive
  set does not yet provide rounded corners, centered text expressions, or
  adaptive wrapping.
- The six preview fixtures exercise the required short/long, nullable, and
  Vietnamese-diacritic content cases. Automated preview smoke tests render and
  ffprobe every fixture.

Human visual approval remains required before making this template active.
