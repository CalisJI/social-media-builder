# Social Media Builder acceptance criteria

The product is considered ready for handoff when all of the following are true:

1. Vocabulary videos are generated and rendered without requiring an AI agent in the normal runtime path.
2. Vocabulary items can be ingested from Sheet or Discord sources and tracked through a durable posted/pending ledger.
3. Theme upgrades are made by editing a single versioned `theme.json` file, and the renderer/app can interpret that file without code changes.
4. The app runs independently without consuming AI agent tokens during routine operations.

Operational rules:

- AI is used only when creating or revising a theme contract or other intentionally manual design change.
- Existing templates remain reproducible by versioned ID.
- Source ingestion and publish tracking are idempotent.
- Runtime secrets, tokens, and ledger files stay outside source control.
