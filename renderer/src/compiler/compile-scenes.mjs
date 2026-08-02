import { compileImage } from "./compile-image.mjs";
import { compileBox, compileProgress } from "./compile-shape.mjs";
import { compileText } from "./compile-text.mjs";
import { SceneCompileError } from "./compile-animation.mjs";
import { compileAnimations } from "./compile-animation.mjs";
import path from "node:path";

const primitives = new Set(["text", "box", "image", "progress", "group"]);

export function validateScene(scene, packageRoot) {
  if (!Array.isArray(scene)) throw new SceneCompileError("scene must be an array");
  const visit = node => {
    if (!node || typeof node !== "object" || Array.isArray(node)) throw new SceneCompileError("scene primitive must be an object");
    if (!primitives.has(node.type)) throw new SceneCompileError(`unknown scene primitive: ${node.type}`);
    compileAnimations(node.animations);
    if (node.type === "image") {
      if (typeof node.asset !== "string" || !node.asset) throw new SceneCompileError("image.asset must be a non-empty relative path");
      const resolved = packageRoot && path.resolve(packageRoot, node.asset);
      const relative = resolved && path.relative(packageRoot, resolved);
      if (relative && (!relative || relative.startsWith("..") || path.isAbsolute(relative))) throw new SceneCompileError(`unsafe image asset path: ${node.asset}`);
    }
    if (node.type === "group") {
      if (!Array.isArray(node.children)) throw new SceneCompileError("group.children must be an array");
      node.children.forEach(visit);
    }
  };
  scene.forEach(visit);
}

export async function compileScenes({ scene, template, payload, font, saveText }) {
  validateScene(scene, template.packageRoot);
  let serial = 0; const nextId = () => serial++;
  const context = Object.fromEntries(Object.entries({ ...payload, template: template.id }).filter(([, value]) => typeof value === "string"));
  const filters = ["[0:v]scale=1080:1920,setsar=1[base]"];
  const compile = async node => {
    if (!node || typeof node !== "object" || Array.isArray(node)) throw new SceneCompileError("scene primitive must be an object");
    if (!primitives.has(node.type)) throw new SceneCompileError(`unknown scene primitive: ${node.type}`);
    if (node.type === "group") {
      if (!Array.isArray(node.children)) throw new SceneCompileError("group.children must be an array");
      for (const child of node.children) await compile(child); return;
    }
    if (node.type === "image") { const image = compileImage(node, { packageRoot: template.packageRoot, nextId }); filters.push(image.prelude, image.filter); return; }
    const filter = node.type === "text" ? await compileText(node, { font, saveText, context, nextId }) : node.type === "box" ? compileBox(node) : compileProgress(node);
    filters.push(`[base]${filter}[base]`);
  };
  for (const node of scene) await compile(node);
  filters.push("[base]format=yuv420p[out]");
  return filters.join(";");
}

export { SceneCompileError };
