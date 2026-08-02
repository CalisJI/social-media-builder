import { getStrategyRegistry } from "./load-strategies.mjs";

export const defaultStrategyId = "classic-definition-v1";

function reject(message, code) {
  const error = new Error(message);
  error.status = 400;
  error.code = code;
  throw error;
}

export function validateStrategy(strategy, { content = {}, capabilities = [] } = {}) {
  for (const field of strategy.requires) if (content[field] == null || content[field] === "") reject(`strategy ${strategy.id} requires ${field}`, "invalid_payload");
  const available = new Set(capabilities);
  for (const capability of strategy.capabilitiesRequired) if (!available.has(capability)) reject(`strategy ${strategy.id} requires capability ${capability}`, "incompatible_strategy");
}

export async function resolveStrategy(id = defaultStrategyId, { content = {}, capabilities = [] } = {}) {
  const strategy = (await getStrategyRegistry()).get(id);
  if (!strategy) reject(`unknown strategy_id: ${id}`, "unknown_strategy");
  validateStrategy(strategy, { content, capabilities });
  return strategy;
}
