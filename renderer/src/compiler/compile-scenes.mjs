import { SceneCompileError } from "./compile-animation.mjs";
import { resolveComponent } from "./component-registry.mjs";

export function validateScene(scene, packageRoot) {
  if (!Array.isArray(scene)) throw new SceneCompileError("scene must be an array");
  const visit = node => {
    const component = resolveComponent(node?.type);
    component.validate(node, { packageRoot });
    if (node.type === "group") {
      node.children.forEach(visit);
    }
  };
  scene.forEach(visit);
}

export async function compileScenes({ scene, template, payload, font, saveText }) {
  const bindTimings = node => ({ ...node, animations: node.animations?.map(animation => {
    const timing = payload.stageTimings?.[animation.stage];
    return timing ? { ...animation, start: timing.start + (animation.offset ?? 0) } : animation;
  }), ...(node.children && { children: node.children.map(bindTimings) }) });
  scene = scene.map(bindTimings);
  validateScene(scene, template.packageRoot);
  let serial = 0; const nextId = () => serial++;
  const context = Object.fromEntries(Object.entries({ ...payload, template: template.id }).filter(([, value]) => typeof value === "string"));
  const filters = ["[0:v]scale=1080:1920,setsar=1[base]"];
  const compile = async node => {
    const result = await resolveComponent(node?.type).compile(node, { packageRoot: template.packageRoot, font, saveText, context, nextId, compileChildren: async children => { for (const child of children) await compile(child); } });
    if (result?.prelude) filters.push(result.prelude, result.filter);
    else if (result) filters.push(`[base]${result}[base]`);
  };
  for (const node of scene) await compile(node);
  filters.push("[base]format=yuv420p[out]");
  return filters.join(";");
}

export { SceneCompileError };
