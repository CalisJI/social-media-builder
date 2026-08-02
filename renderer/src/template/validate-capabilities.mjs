const legacyDeclarations = Object.freeze({
  capabilities: Object.freeze([]),
  compatibleStrategies: Object.freeze(["classic-definition-v1"]),
});

function fail(message, code = "invalid_template") {
  const error = new Error(message);
  error.status = 400;
  error.code = code;
  throw error;
}

function normalizeList(template, field, fallback) {
  const value = template[field] ?? fallback;
  if (!Array.isArray(value) || value.some(item => typeof item !== "string" || !item.trim())) {
    fail(`template ${template.id || "unknown"} ${field} must be an array of non-empty strings`);
  }
  const normalized = value.map(item => item.trim());
  if (new Set(normalized).size !== normalized.length) {
    fail(`template ${template.id || "unknown"} ${field} must not contain duplicates`);
  }
  return Object.freeze(normalized);
}

export function resolveTemplateCapabilities(template) {
  if (!template || typeof template !== "object" || Array.isArray(template)) fail("template manifest must be an object");
  return Object.freeze({
    capabilities: normalizeList(template, "capabilities", legacyDeclarations.capabilities),
    compatibleStrategies: normalizeList(template, "compatibleStrategies", legacyDeclarations.compatibleStrategies),
  });
}

export function validateTemplateStrategyCompatibility(template, strategy) {
  const declarations = resolveTemplateCapabilities(template);
  if (!strategy?.id || typeof strategy.id !== "string") fail("strategy id is required", "invalid_strategy");
  if (!declarations.compatibleStrategies.includes(strategy.id)) {
    fail(`template ${template.id || "unknown"} is not compatible with strategy ${strategy.id}`, "incompatible_strategy");
  }
  const capabilities = new Set(declarations.capabilities);
  for (const capability of strategy.capabilitiesRequired ?? []) {
    if (!capabilities.has(capability)) {
      fail(`template ${template.id || "unknown"} lacks capability ${capability} required by strategy ${strategy.id}`, "incompatible_strategy");
    }
  }
  return declarations;
}
