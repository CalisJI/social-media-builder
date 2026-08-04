# Preview, Approval, and Template Library

## Objective

Make template creation a repeatable product workflow rather than an agent-only engineering activity.

## Preview session

A preview session records:

- candidate template version;
- sample content snapshot;
- platform profile;
- renderer version;
- preview artifact;
- quality results;
- warnings;
- user feedback;
- status.

## Approval rule

Only the user or an authorized product owner may convert a candidate into an accepted library version. Automated QA and agent review are necessary but do not replace user acceptance for the Gold Standard milestone.

## Template library record

Required fields:

- stable template ID;
- version ID;
- name;
- description;
- content type;
- supported platforms/aspects;
- status;
- template DSL document;
- design-token references;
- asset references;
- audio preset;
- preview thumbnail/video;
- tags;
- provenance;
- creator type: user, built-in, agent-assisted, image-derived;
- created/accepted timestamps;
- compatibility constraints;
- quality score/report;
- rollback ancestry.

## Library operations

- list/search/filter;
- preview;
- select for rendering;
- duplicate as draft;
- edit safe controls;
- create new version;
- activate/deactivate;
- deprecate;
- rollback;
- export/import in a controlled format.

## Edit model

Accepted versions are immutable. Edits create a draft based on the accepted version. A draft must pass preview and approval again before activation.

## Default-template behavior

The app must provide a default accepted TikTok template. If no agent is available, users can still:

```text
choose accepted template → enter content → preview → render → publish
```

## Template compatibility

A template declares the content fields and capabilities it requires. The UI should explain missing fields before render.

## Storage approach

The exact database technology may follow the existing app. The minimum design is:

- template metadata in database;
- immutable DSL versions stored as JSON;
- assets in managed object/file storage;
- preview and production artifacts referenced by ID;
- checksums for reproducibility.

## Initial UI surfaces

1. Template picker.
2. Template details and preview.
3. Reference-image upload/create-template action.
4. Candidate preview and feedback.
5. Accept and save to library.
6. Version history.
7. Create new version.

The first release may be simple, but the data model must support future refinement.

