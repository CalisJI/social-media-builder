import { legacyV1 } from "../engines/legacy-v1.mjs";
import { sceneV2 } from "../engines/scene-v2.mjs";

const engines = new Map([[legacyV1.id, legacyV1], [sceneV2.id, sceneV2]]);

export function resolveTemplateEngine(template) {
  const id = template.engine ?? legacyV1.id;
  const engine = engines.get(id);
  if (engine) return engine;
  const error = new Error(`unknown template engine: ${id}`);
  error.status = 400;
  error.code = "invalid_template";
  throw error;
}
