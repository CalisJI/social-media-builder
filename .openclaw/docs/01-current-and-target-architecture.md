# Current and Target Architecture

## Current architecture to preserve

```text
n8n / Web
   -> POST /v1/renders
   -> normalize payload
   -> resolve versioned template
   -> build FFmpeg graph
   -> render MP4
   -> cache by idempotency key
```

## Incremental target

```text
Render Request
   -> API Compatibility Adapter
   -> Normalized Render Job
   -> Strategy Resolver
   -> Template Resolver
   -> Constraint / Adaptive Layout Resolver
   -> Engine Router
      -> legacy-v1 (existing)
      -> scene-v2 (new)
   -> FFmpeg Compiler
   -> Artifact QA
   -> MP4 + render manifest
```

## Responsibility boundaries

### n8n
- select content;
- claim jobs;
- call renderer;
- upload and publish;
- update lifecycle state.

### Content preparation workflow
- dictionary and translation;
- educational metadata;
- quality gate;
- store full content.

### Renderer
- presentation decisions allowed by requested/default strategy;
- template selection and compatibility;
- adaptive layout;
- audio/video assembly;
- deterministic artifact output.

### Template package
- visual tokens;
- components;
- layout;
- constraints;
- capabilities;
- supported strategies;
- assets;
- version metadata.

### Strategy package
- retention sequence;
- stage timing and content roles;
- required/optional content fields;
- compatibility requirements.

The renderer must not query dictionaries, translate content, or publish TikTok.
