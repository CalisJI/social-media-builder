# Template Lifecycle and Preview

## Required lifecycle

```text
imported -> validated -> previewed -> active -> deprecated
```

Import must not automatically activate a template.

## APIs to add

- `POST /v1/templates/validate`
- `POST /v1/templates/preview`
- `POST /v1/templates/activate`
- `GET /v1/templates`
- Keep existing import API as a compatibility endpoint.

## Preview fixture set

Each template must render:
- shortest valid word;
- longest supported word;
- short meaning;
- long but valid meaning;
- missing optional IPA/example;
- Vietnamese diacritics;
- stress case near overflow.

## Activation gate

Activation requires:
- schema validation;
- asset validation;
- compatibility validation;
- successful preview render;
- no text overflow;
- output media validation.
