# Vocabulary Pastel v1

Renderer-ready design contract for a 10-second TikTok vocabulary video. This
template replaces the manual Canva step while retaining the reference video's
soft cloud-gradient, cream card and petal motif.

## Files

- `design-spec.md`: exact layout, safe zones, storyboard, motion and overflow rules.
- `schema.json`: JSON Schema (Draft 2020-12) for one normalized render item.
- `example.json`: accepted render input based on CAL-30.
- `assets/background.svg`: original 1080x1920 pastel background.
- `assets/petal.svg`: original decorative petal used by the motion layer.
- `assets/LICENSE.md`: provenance and permitted use of every bundled asset/font.

The renderer should validate the normalized item against `schema.json`, apply
the defaults described in `design-spec.md`, then render at 1080x1920, 30 fps.
No Canva API or manual edit is required.
