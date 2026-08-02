import { readFile, writeFile } from 'node:fs/promises';
const [tasks, phases] = await Promise.all(['project/tasks.json', 'project/phases.json'].map(async path => JSON.parse(await readFile(path, 'utf8'))));
const weights = { backlog: 0, ready: 0, in_progress: 25, in_review: 50, merged: 75, verified: 100, released: 100, blocked: 0, cancelled: null };
const icon = { backlog: '○', ready: '○', in_progress: '🛠', in_review: '🔎', merged: '◐', verified: '✅', released: '✅', blocked: '⛔', cancelled: '—' };
const progress = items => { const eligible = items.filter(task => weights[task.status] !== null); return eligible.length ? Math.round(eligible.reduce((sum, task) => sum + weights[task.status], 0) / eligible.length) : 0; };
const lines = ['<!-- GENERATED FILE — DO NOT EDIT MANUALLY -->', '', '# Roadmap'];
for (const phase of [...phases].sort((a, b) => a.order - b.order)) { const items = phase.taskIds.map(id => tasks.find(task => task.id === id)); const blocked = items.filter(task => task.status === 'blocked'); lines.push('', `## ${phase.name} — ${progress(items)}%`, ''); for (const task of items) lines.push(`- ${icon[task.status]} **${task.id}** ${task.title} — ${task.status}; priority: ${task.priority}; owner: ${task.owner ?? 'UNASSIGNED'}; depends on: ${task.dependsOn.join(', ') || 'none'}; unlocks: ${task.unlocks.join(', ') || 'none'}`); lines.push(`\nBlocked: ${blocked.length ? blocked.map(task => `${task.id} (${task.blockedReason})`).join('; ') : 'none'}`); }
await writeFile('docs/governance/ROADMAP.md', `${lines.join('\n')}\n`);
