# Product Scope and Success Criteria

## Product statement

Social Media Builder is an application that turns structured content and reusable design templates into short-form social videos. It supports a no-agent path for normal users and an optional AI-assisted path for generating new design templates from prompts or reference images.

## In scope

- Professional short-form video rendering.
- Reusable and versioned templates.
- TikTok-first 9:16 output.
- User-provided reference images.
- AI-assisted extraction of palette, composition, hierarchy, and visual style.
- Preview, acceptance, rejection, revision, and template-library persistence.
- Adaptive typography, layout, motion, and audio.
- Asset catalog and licensing metadata.
- Deterministic render plans.
- Visual, audio, and technical quality gates.
- Independent review workflow.

## Explicitly out of scope for this program

- Rebuilding TikTok, YouTube, Facebook, or Instagram connections.
- Rebuilding authentication or publishing flows that already work.
- Re-auditing all previously rendered videos.
- Building a template marketplace before the internal library works.
- Building video-to-template extraction before image-to-template is stable.
- Supporting every content type before the first TikTok vocabulary module is publish-ready.
- Allowing AI to inject arbitrary renderer code at runtime.

## User modes

### Mode A — Use built-in template

```text
Select template → enter content → preview → render → publish
```

No agent is required.

### Mode B — Create template from reference image

```text
Upload image → analyze → generate candidate template → preview sample content
→ accept / revise / reject → save accepted version to library
```

An AI service or design agent may assist, but the resulting template must be validated data.

### Mode C — Agent-assisted creative direction

```text
Provide goal and content → Creative Director proposes plan → engine validates
→ preview → user approves → template/version saved
```

The agent chooses from supported capabilities; it does not bypass the engine.

## Phase 1 target persona

A creator building an English-vocabulary TikTok channel who needs:

- 10–15 second videos;
- fast comprehension;
- readable English and Vietnamese text;
- clear pronunciation audio;
- animated challenge/reveal structure;
- reliable batch generation;
- consistent branding.

## North-star outcome

The owner can select a template, enter a vocabulary item, preview the result, approve it, and publish a video that looks deliberately designed rather than technically generated.

## Phase 1 success criteria

All conditions are required:

1. A 1080×1920 H.264 TikTok video is produced from structured content.
2. The owner approves at least one rendered fixture as publishable.
3. Voice is clearly audible on a normal phone speaker.
4. Background music and effects support, rather than mask, the voice.
5. No text clips, overlaps, leaves safe bounds, or becomes unreadably small.
6. The first second contains a clear hook or active visual change.
7. The reveal moment has an audiovisual payoff.
8. The CTA is visible and intentionally animated.
9. The template works with short, normal, and stress-test content.
10. The accepted template is saved as a reusable, versioned library record.
11. The same template can render a new word without code changes or an agent.
12. The existing publishing pipeline remains functional.

## Quality over breadth

A single excellent template is more valuable than ten weak templates. No phase may claim success based solely on schema completion, test counts, or architectural coverage.

