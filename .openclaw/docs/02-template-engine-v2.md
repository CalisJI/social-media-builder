# Template Engine V2 Specification

## Migration approach

Add `engine` to each template manifest.

```json
{
  "id": "vocabulary-pastel-v1",
  "engine": "legacy-v1",
  "templateSchemaVersion": 1
}
```

New templates use:

```json
{
  "id": "vocabulary-quiz-v1",
  "engine": "scene-v2",
  "templateSchemaVersion": 2
}
```

The engine router must default old manifests to `legacy-v1`.

## Template V2 package

```text
templates/<template-id>/
  manifest.json
  theme.json
  scenes.json
  schema.json
  assets/
  fixtures/
  README.md
```

## Manifest additions

- engine
- templateSchemaVersion
- capabilities
- compatibleStrategies
- constraints
- componentStyles
- asset declarations
- lifecycle status: imported | validated | previewed | active | deprecated

## Declarative scene primitives for first release

- text
- box
- image
- progress
- group

## Supported animations for first release

- none
- fade
- rise
- scale
- slide-left
- slide-right

Unknown primitives and animations must fail validation before FFmpeg executes.

## Compatibility

Legacy templates continue through existing functions.
No current template is converted during the first engine-router task.
