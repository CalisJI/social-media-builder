import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rendererRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const strategiesRoot = path.resolve(process.env.RENDER_STRATEGIES_DIR || path.join(rendererRoot, "../../strategies"));

function invalid(message) {
  const error = new Error(message);
  error.status = 400;
  error.code = "invalid_strategy";
  throw error;
}

export async function loadStrategies(root = strategiesRoot) {
  const registry = new Map();
  for (const item of await readdir(root, { withFileTypes: true })) {
    if (!item.isFile() || path.extname(item.name) !== ".json") continue;
    const strategy = JSON.parse(await readFile(path.join(root, item.name), "utf8"));
    if (!strategy.id || registry.has(strategy.id)) invalid(`invalid or duplicate strategy id: ${strategy.id || item.name}`);
    for (const key of ["requires", "optional", "capabilitiesRequired", "stages"]) if (!Array.isArray(strategy[key])) invalid(`strategy ${strategy.id} requires ${key}`);
    if (strategy.splitScene != null && typeof strategy.splitScene !== "boolean" && (!Array.isArray(strategy.splitScene) || strategy.splitScene.some(id => typeof id !== "string" || !id))) invalid(`strategy ${strategy.id} splitScene must be a boolean or stage ID array`);
    registry.set(strategy.id, Object.freeze(strategy));
  }
  return registry;
}

let registryPromise;
export const getStrategyRegistry = () => registryPromise ||= loadStrategies();
