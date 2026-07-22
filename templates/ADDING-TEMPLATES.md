# Add a renderer template

Templates are versioned packages, similar to editable Canva designs. Clone an
existing directory, choose a new immutable `id`, and edit `manifest.json`.
Palette, asset paths, layout bounds, and timeline live in the manifest; payload
rules live in its JSON schema. Keep licensed assets inside the package and add
their source/license/checksum to `assets/LICENSE.md`.

The renderer discovers every `templates/*/manifest.json` at startup. No API
endpoint change is needed. A package is rejected when its ID is duplicated,
paths escape the package root, required configuration is missing, or its safe
zone exceeds 1080x1920. Test the new ID and an unknown ID before publishing.
Changing layout or timing requires a new ID so old jobs remain reproducible.
