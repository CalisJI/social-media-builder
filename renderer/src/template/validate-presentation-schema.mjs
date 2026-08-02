import { validateScene } from "../compiler/compile-scenes.mjs";

const capabilities = new Set(["mistakeCorrection", "quizReveal"]);

function fail(message) {
  const error = new Error(message);
  error.status = 400;
  error.code = "invalid_template";
  throw error;
}

export function validatePresentationSchema(template, packageRoot) {
  const engine = template.engine ?? "legacy-v1";
  if (engine === "legacy-v1") {
    if (template.templateSchemaVersion !== undefined && template.templateSchemaVersion !== 1) fail(`unsupported legacy template schema version: ${template.templateSchemaVersion}`);
    return 1;
  }
  if (template.templateSchemaVersion !== 2) fail("scene-v2 templates require templateSchemaVersion: 2");
  if (!Array.isArray(template.capabilities) || template.capabilities.some(capability => !capabilities.has(capability))) fail("template capabilities must be declared supported capabilities");
  const ids = new Set();
  const visit = component => {
    if (component.id !== undefined) {
      if (typeof component.id !== "string" || !component.id.trim() || ids.has(component.id)) fail(`duplicate or invalid component id: ${component.id}`);
      ids.add(component.id);
    }
    component.children?.forEach(visit);
  };
  template.scene?.forEach(visit);
  validateScene(template.scene, packageRoot);
  return 2;
}