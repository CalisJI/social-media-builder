# Design spec — `vocabulary-pastel-v1`

## Output contract

- Canvas: 1080x1920 (9:16), 30 fps, 300 frames, 10.0 seconds.
- Delivery: MP4, H.264 High, `yuv420p`; audio is optional. CAL-30 renders silent.
- Background and petal art are bundled SVGs. All text remains live renderer text.
- Coordinates below are canvas pixels, origin at top-left.

## Visual system

- Mood: calm, encouraging and editorial; preserve the reference's pastel cloud,
  cream card and petals while making the learning sequence legible immediately.
- Background: `assets/background.svg`, full bleed. Add a slow 102% to 106% scale
  across the whole composition; never reveal canvas edges.
- Card: x=96, y=300, w=888, h=1150, radius=52, fill `#FFF8EC` at 96%, shadow
  `0 24 70 rgba(55,45,80,.18)`.
- Primary ink `#27243A`; secondary `#625D78`; accent `#E85D75`; pronunciation
  pill `#E7D9FF`; CTA `#27243A` on `#FFF8EC`.
- Font: `Noto Sans` (SIL Open Font License 1.1). Use weight 800 for the word,
  700 for labels/CTA, 500 for body and 400 for IPA. System fallback order:
  `Noto Sans`, `Arial`, `sans-serif`.

## TikTok safe zones

- All essential content stays inside x=80..920 and y=220..1500.
- The card may extend to x=984 decoratively, but text ends at x=900 to reserve
  180 px on the right for TikTok controls.
- No essential element below y=1500; reserve the last 420 px for caption/navigation.
- Decorative petals can leave the safe zone and must have `pointer-events: none`.

## Storyboard (300 frames)

| Frames | Time | Content and motion |
|---|---:|---|
| 0–35 | 0.00–1.17s | Hook `TỪ NÀY NGHĨA LÀ GÌ?` rises 36 px and fades in; card scales 96→100%. |
| 24–84 | 0.80–2.80s | Word, IPA and part of speech reveal. Word uses a 6-frame accent underline wipe. |
| 66–132 | 2.20–4.40s | Vietnamese meaning fades/slides in by line; keep visible through frame 224. |
| 120–224 | 4.00–7.47s | Example EN then VI appears. With audio, pronunciation starts no earlier than frame 126; silent input changes no timing. |
| 216–282 | 7.20–9.40s | CTA pill rises into y=1320. Handle remains visible in the CTA. |
| 282–299 | 9.40–10.00s | Hold all final content with no fade-to-black. |

Petals drift 18–42 px vertically and rotate at most 12 degrees over 10 seconds.
Keep motion eased (`cubic-bezier(.22,1,.36,1)`), never flashing or bouncing.

## Layout and typography

| Element | Bounds (x,y,w,h) | Type |
|---|---|---|
| Hook | 140,230,760,64 | 36 px / 700, tracking 3 px, uppercase, centered |
| Word | 140,405,760,150 | 104 px / 800, line-height 1.0, centered |
| IPA pill | 210,565,620,64 | 38 px / 400, centered |
| Part of speech | 290,646,460,48 | 30 px / 700, centered, accent |
| Meaning label | 148,748,744,38 | 26 px / 700, uppercase |
| Meaning | 148,797,744,180 | 44 px / 700, line-height 1.18 |
| Example label | 148,1005,744,38 | 26 px / 700, uppercase |
| Example EN | 148,1054,744,112 | 36 px / 600, line-height 1.22 |
| Example VI | 148,1176,744,94 | 30 px / 500, line-height 1.25, secondary ink |
| CTA | 160,1320,720,104 | 34 px / 700, one line, centered |

## Overflow and nullable rules

Normalize whitespace and trim every string before layout. Never shrink below the
minimum size in this table; reject input that still overflows after wrapping.

| Field | Limit | Wrapping/fallback |
|---|---:|---|
| `word` | 24 chars | 1 line; 104→72 px. Reject if still wider than 760 px. |
| `ipa` | 48 chars or null | 1 line; 38→30 px. If null/empty, show `Phát âm đang cập nhật` and do not reserve audio. |
| `part_of_speech` | 24 chars or null | Map known values to display labels; null becomes `từ vựng`. |
| `meaning_vi` | 90 chars | Max 3 lines; 44→36 px. |
| `example_en` | 90 chars or null | Max 2 lines; 36→30 px. Null becomes `Ví dụ đang cập nhật`. |
| `example_vi` | 100 chars or null | Max 2 lines; 30→26 px. Null hides this row and lets EN use the full 206 px example area. |
| `cta` | 54 chars or null | One line; null becomes `Follow {brand_handle} • 1 từ mỗi ngày`. |
| `brand_handle` | 32 chars | Required; must start with `@`. |
| audio URLs | URL or null | Null produces a silent MP4; never fetch an implicit third-party asset. |

Text measurement must use the actual loaded font before rendering. A font-load
failure is a render error, not permission to silently change typography.

## Renderer mapping

The CAL-30 batch envelope contains `entries[]`; the orchestration layer emits one
normalized render item per entry:

```text
template_id       <- envelope.template_id
duration_seconds  <- envelope.duration_seconds
brand_handle      <- envelope.brand_handle
word..example_vi  <- entry fields of the same name
cta               <- entry.cta ?? "Follow {brand_handle} • 1 từ mỗi ngày"
pronunciation_audio_url <- entry.pronunciation_audio_url
background_music_url    <- entry.background_music_url
```

`template_id` is versioned and immutable. Any layout/timing change requires a new
ID (for example `vocabulary-pastel-v2`) so old jobs remain reproducible.

## Acceptance checks

1. Validate the normalized object against `schema.json` before media work.
2. Confirm every text bounding box stays inside its declared bounds at 100% scale.
3. Confirm essential content stays inside x=80..920/y=220..1500.
4. Probe output: 1080x1920, 30 fps, duration 9.8–10.2 s, H.264, `yuv420p`.
5. For null audio, accept an MP4 with no audio stream. Do not synthesize audio.
6. Capture frames 30, 84, 132, 224 and 290 for visual regression/QA.
