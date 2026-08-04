# Video Design Engine Architecture

## Architectural intent

Separate creative decisions from rendering implementation.

```text
Content + Template Version + Asset References
                    ↓
              Plan Compiler
                    ↓
         Validated Render Plan
                    ↓
 Layout / Typography / Motion / Audio Engines
                    ↓
          Preview or Production Renderer
                    ↓
       Visual + Audio + Technical Quality Gates
```

## Existing application boundary

The existing Social Media Builder remains responsible for:

- authentication;
- content management;
- connected social accounts;
- scheduling and publishing;
- job status and user-facing workflow.

The new Video Design Engine is introduced behind a stable interface. Existing publishing code receives a completed media artifact and metadata exactly as before.

## Core modules

### 1. Content Normalizer

Converts user input, spreadsheet data, APIs, or AI output into a validated content record.

Responsibilities:

- trim and normalize text;
- preserve language and semantic fields;
- reject missing required data;
- never invent meaning at the renderer level.

### 2. Template Registry

Stores template metadata and version references.

Responsibilities:

- active and draft versions;
- compatibility declarations;
- content-type support;
- platform/aspect support;
- provenance and licensing;
- deprecation and rollback.

### 3. Template Compiler

Converts Template DSL plus content into a render plan.

Responsibilities:

- resolve tokens;
- bind content to slots;
- choose layout variants;
- compile scene timing;
- enforce safe areas;
- resolve assets;
- produce warnings or errors;
- remain deterministic for the same inputs and version.

### 4. Design Token Resolver

Resolves semantic values such as:

- `color.surface.primary`
- `type.display.word`
- `space.scene.gutter`
- `radius.card.large`
- `shadow.card.elevated`

No template should depend on unexplained raw values when a token exists.

### 5. Layout Engine

Responsibilities:

- box constraints;
- anchors and alignment;
- responsive variants;
- safe-area intersection;
- stack/grid primitives;
- collision and overflow detection;
- split-scene decisions.

### 6. Typography Engine

Responsibilities:

- font registry;
- glyph support;
- real text measurement;
- balanced wrapping;
- line clamping only when allowed;
- adaptive sizing within declared limits;
- highlighted spans and bilingual hierarchy.

### 7. Motion Engine

Responsibilities:

- named presets;
- scene transitions;
- deterministic timing;
- motion intensity profiles;
- reduced-motion/debug modes;
- no uncontrolled simultaneous motion.

### 8. Audio Engine

Responsibilities:

- voice, music, and SFX tracks;
- gain normalization;
- ducking;
- fades;
- timeline alignment;
- technical analysis and validation.

### 9. Asset Resolver

Resolves approved assets by ID and validates:

- file availability;
- media type;
- dimensions/duration;
- license metadata;
- brand and style tags;
- checksum/version.

### 10. Preview Renderer

Optimized for low latency. It may use lower resolution/bitrate but must preserve layout, timing, and audio relationships.

### 11. Production Renderer

Produces final video with controlled codecs, bitrate, audio, color, and metadata.

### 12. Quality Gate Service

Runs:

- schema validation;
- static layout checks;
- frame sampling;
- visual checks;
- audio checks;
- technical media checks;
- comparison against acceptance thresholds.

### 13. Template Generation Service

Optional AI-assisted module that converts a reference or prompt into a candidate DSL document. It never writes renderer source directly.

### 14. Template Approval and Library Service

Manages:

- preview sessions;
- user decisions;
- accepted versions;
- draft revisions;
- provenance;
- future reuse.

## Required interfaces

### Compile

```ts
compileTemplate({
  templateVersion,
  content,
  platformProfile,
  assetCatalogSnapshot,
  renderMode
}) => RenderPlan
```

### Validate plan

```ts
validateRenderPlan(renderPlan) => {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}
```

### Render preview

```ts
renderPreview(renderPlan) => PreviewArtifact
```

### Approve template

```ts
approveTemplateCandidate({
  candidateId,
  previewArtifactId,
  userId,
  notes
}) => TemplateVersion
```

### Render production

```ts
renderProduction(renderPlan) => ProductionArtifact
```

## Determinism

A render must be reproducible from:

- template version ID;
- content snapshot;
- asset version IDs;
- renderer version;
- platform profile;
- random seed, if decorative variation is allowed.

## Extension strategy

Start with a limited DSL and generic primitives that can express the TikTok module. Add DSL features only when a reviewed template requires them. Do not design an unrestricted visual programming language in Phase 1.

