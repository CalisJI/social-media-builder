const categories = ["colors", "typography", "spacing", "radius", "shadows", "motion"];
const color = /^#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?$/;

function fail(message) {
  const error = new Error(message);
  error.status = 400;
  error.code = "invalid_template";
  throw error;
}

function getToken(tokens, reference) {
  const value = reference.slice(1).split(".").reduce((current, key) => current && typeof current === "object" ? current[key] : undefined, tokens);
  if (value === undefined || (value && typeof value === "object")) fail(`unknown design token: ${reference}`);
  return value;
}

function resolve(value, tokens) {
  if (typeof value === "string" && value.startsWith("$")) return getToken(tokens, value);
  if (Array.isArray(value)) return value.map(item => resolve(item, tokens));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolve(item, tokens)]));
  return value;
}

function validateTokens(tokens) {
  if (!tokens || typeof tokens !== "object" || Array.isArray(tokens)) fail("template tokens must be an object");
  for (const category of categories) {
    if (!tokens[category] || typeof tokens[category] !== "object" || Array.isArray(tokens[category]) || !Object.keys(tokens[category]).length) fail(`template tokens.${category} must be a non-empty object`);
  }
  for (const [name, value] of Object.entries(tokens.colors)) if (typeof value !== "string" || !color.test(value)) fail(`tokens.colors.${name} must be a hexadecimal color`);
}

function validateSceneTokens(scene) {
  const visit = node => {
    if (!node || typeof node !== "object") return;
    for (const key of ["color", "background"]) if (node[key] !== undefined && (typeof node[key] !== "string" || !node[key].startsWith("$colors."))) fail(`scene ${key} must reference a named color token`);
    node.children?.forEach(visit);
  };
  scene?.forEach(visit);
}

export function resolveDesignTokens(template) {
  if (template.engine !== "scene-v2") return template;
  validateTokens(template.tokens);
  validateSceneTokens(template.scene);
  return resolve(template, template.tokens);
}
