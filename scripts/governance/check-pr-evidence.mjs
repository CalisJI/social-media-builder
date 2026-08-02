import { readFile } from 'node:fs/promises';
const body = process.env.PR_BODY ?? (process.argv[2] ? await readFile(process.argv[2], 'utf8') : '');
const sections = ['## Task', '## Requirement completed', '## Acceptance criteria', '## Changes', '## Tests', '## Backward compatibility', '## Architecture compliance', '## Evidence', '## Risks and limitations', '## Rollback plan', '## Reviewer decision'];
const missing = sections.filter(section => !body.includes(section));
if (missing.length) { console.error(`Missing PR evidence sections: ${missing.join(', ')}`); process.exit(1); }
console.log('PR evidence sections are present.');
