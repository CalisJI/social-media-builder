const object = value => value && typeof value === "object" && !Array.isArray(value);
const aliases = { part: "part_of_speech", meaning: "meaning_vi", exampleEn: "example_en", exampleVi: "example_vi" };
const field = (content, name) => content[name] ?? content[aliases[name]] ?? null;
const missing = value => value == null || value === "";
const placeholders = value => typeof value === "string" ? [...value.matchAll(/\{([A-Za-z][A-Za-z0-9_]*)\}/g)].map(([, name]) => name) : [];

export class PresentationTreeError extends Error {
  constructor(message, code = "invalid_presentation_tree") {
    super(message);
    this.status = 400;
    this.code = code;
  }
}

function contentFrom(job) {
  const content = job?.content ?? job?.entry ?? job;
  if (!object(content)) throw new PresentationTreeError("normalized render job content must be an object");
  return content;
}

function bind(component, content) {
  const references = Object.values(component).flatMap(placeholders);
  if (references.some(name => missing(field(content, name)))) return null;
  const bound = Object.fromEntries(Object.entries(component).map(([key, value]) => [key, typeof value === "string" ? value.replace(/\{([A-Za-z][A-Za-z0-9_]*)\}/g, (_, name) => field(content, name)) : value]));
  if (Array.isArray(component.children)) {
    bound.children = component.children.map(child => bind(child, content)).filter(Boolean);
    if (!bound.children.length) return null;
  }
  return bound;
}

export function buildPresentationTree({ job, strategy, template }) {
  const content = contentFrom(job);
  if (!object(strategy) || !Array.isArray(strategy.requires) || !Array.isArray(strategy.stages)) throw new PresentationTreeError("strategy requires requires and stages arrays");
  if (!object(template) || !Array.isArray(template.scene)) throw new PresentationTreeError("template requires a scene array");
  for (const name of strategy.requires) {
    if (missing(field(content, name))) throw new PresentationTreeError(`strategy ${strategy.id} requires content.${name}`, "missing_strategy_field");
  }
  return {
    templateId: template.id,
    strategyId: strategy.id,
    stages: strategy.stages.filter(stage => !missing(field(content, stage.role))).map(stage => ({ ...stage, value: field(content, stage.role) })),
    components: template.scene.map(component => bind(component, content)).filter(Boolean),
  };
}
