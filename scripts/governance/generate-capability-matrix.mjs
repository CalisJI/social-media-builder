import { readFile, writeFile } from 'node:fs/promises';
const capabilities = JSON.parse(await readFile('project/capabilities.json', 'utf8'));
const evidence = capability => [...capability.evidence.pullRequests.map(number => `PR #${number}`), ...capability.evidence.tests].join('; ') || '—';
const lines = ['<!-- GENERATED FILE — DO NOT EDIT MANUALLY -->', '', '# Capability Matrix', '', '| Area | Capability | Status | Evidence | Human check |', '|---|---|---|---|---|', ...capabilities.map(capability => `| ${capability.category} | ${capability.name} | ${capability.status} | ${evidence(capability)} | ${capability.humanVerificationRequired ? 'Required' : 'Not required'} |`)];
await writeFile('docs/governance/CAPABILITY_MATRIX.md', `${lines.join('\n')}\n`);
