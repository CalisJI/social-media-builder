import { readFile } from 'node:fs/promises';

const json = async path => JSON.parse(await readFile(path, 'utf8'));
const schemas = { task: await json('project/schemas/task.schema.json'), capability: await json('project/schemas/capability.schema.json') };
const errors = [];
const typeMatches = (value, type) => type === 'null' ? value === null : type === 'array' ? Array.isArray(value) : type === 'integer' ? Number.isInteger(value) : typeof value === type;
function validate(value, schema, path) {
  if (schema.type && !(Array.isArray(schema.type) ? schema.type : [schema.type]).some(type => typeMatches(value, type))) return errors.push(`${path}: expected ${schema.type}`);
  if (schema.enum && !schema.enum.includes(value)) errors.push(`${path}: must be one of ${schema.enum.join(', ')}`);
  if (schema.minLength && value.length < schema.minLength) errors.push(`${path}: must not be empty`);
  if (schema.minItems && value.length < schema.minItems) errors.push(`${path}: needs at least ${schema.minItems} item(s)`);
  if (Array.isArray(value) && schema.items) value.forEach((item, index) => validate(item, schema.items, `${path}[${index}]`));
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const key of schema.required ?? []) if (!(key in value)) errors.push(`${path}: missing ${key}`);
    if (schema.additionalProperties === false) for (const key of Object.keys(value)) if (!schema.properties?.[key]) errors.push(`${path}: unknown property ${key}`);
    for (const [key, child] of Object.entries(schema.properties ?? {})) if (key in value) validate(value[key], child, `${path}.${key}`);
  }
}
const [tasks, capabilities, phases] = await Promise.all([json('project/tasks.json'), json('project/capabilities.json'), json('project/phases.json')]);
if (!Array.isArray(tasks) || !Array.isArray(capabilities) || !Array.isArray(phases)) errors.push('Project registries must be arrays.');
tasks.forEach((task, index) => validate(task, schemas.task, `tasks[${index}]`));
capabilities.forEach((capability, index) => validate(capability, schemas.capability, `capabilities[${index}]`));
const taskIds = new Set();
for (const task of tasks) { if (taskIds.has(task.id)) errors.push(`duplicate task ID: ${task.id}`); taskIds.add(task.id); if (['merged', 'verified', 'released'].includes(task.status) && !task.completedAt) errors.push(`${task.id}: completed task needs completedAt`); }
const capabilityIds = new Set(capabilities.map(capability => capability.id));
for (const task of tasks) for (const dependency of task.dependsOn) if (!taskIds.has(dependency)) errors.push(`${task.id}: unknown dependency ${dependency}`);
for (const task of tasks) for (const capability of task.capabilities) if (!capabilityIds.has(capability)) errors.push(`${task.id}: unknown capability ${capability}`);
for (const capability of capabilities) if (capability.status === 'verified' && !capability.evidence.pullRequests.length && !capability.evidence.tests.length) errors.push(`${capability.id}: verified capability needs evidence`);
const visiting = new Set(), visited = new Set();
function visit(id, chain = []) { if (visiting.has(id)) return errors.push(`circular dependency: ${[...chain, id].join(' -> ')}`); if (visited.has(id)) return; visiting.add(id); const task = tasks.find(item => item.id === id); task.dependsOn.forEach(dependency => visit(dependency, [...chain, id])); visiting.delete(id); visited.add(id); }
tasks.forEach(task => visit(task.id));
for (const phase of phases) for (const taskId of phase.taskIds) if (!taskIds.has(taskId)) errors.push(`${phase.id}: unknown task ${taskId}`);
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`Validated ${tasks.length} tasks, ${capabilities.length} capabilities, and ${phases.length} phases.`);
