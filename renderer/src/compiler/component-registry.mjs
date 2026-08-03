import path from "node:path";
import { compileAnimations, SceneCompileError } from "./compile-animation.mjs";
import { compileImage } from "./compile-image.mjs";
import { compileBox, compileProgress } from "./compile-shape.mjs";
import { compileText } from "./compile-text.mjs";

const object = node => {
  if (!node || typeof node !== "object" || Array.isArray(node)) throw new SceneCompileError("scene component must be an object");
};

const validateBase = node => { object(node); compileAnimations(node.animations); };
const validateImage = (node, { packageRoot }) => {
  validateBase(node);
  if (typeof node.asset !== "string" || !node.asset) throw new SceneCompileError("image.asset must be a non-empty relative path");
  const asset = path.resolve(packageRoot, node.asset);
  const relative = path.relative(packageRoot, asset);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) throw new SceneCompileError(`unsafe image asset path: ${node.asset}`);
};
const validateGroup = node => {
  validateBase(node);
  if (!Array.isArray(node.children)) throw new SceneCompileError("group.children must be an array");
};

const define = (type, input, validate, compile) => Object.freeze({ id: type, type, input: Object.freeze({ ...input, timeline: "animations" }), validate, compile });

export const componentRegistry = new Map([
  ["text", define("text", { layout: ["x", "y", "maxWidth", "maxHeight"], style: ["fontSize", "minFontSize", "maxLines", "weight", "color", "lineSpacing"], content: ["text"] }, validateBase, (node, context) => compileText(node, context))],
  ["box", define("box", { layout: ["x", "y", "width", "height"], style: ["color", "opacity"] }, validateBase, node => compileBox(node))],
  ["image", define("image", { layout: ["x", "y", "width", "height"], style: [], content: ["asset"] }, validateImage, (node, context) => compileImage(node, context))],
  ["progress", define("progress", { layout: ["x", "y", "width", "height"], style: ["background", "color"], content: ["value"] }, validateBase, node => compileProgress(node))],
  ["group", define("group", { layout: [], style: [], content: ["children"] }, validateGroup, (node, { compileChildren }) => compileChildren(node.children))],
]);

export function resolveComponent(type) {
  const component = componentRegistry.get(type);
  if (!component) throw new SceneCompileError(`unknown scene primitive: ${type}`);
  return component;
}
