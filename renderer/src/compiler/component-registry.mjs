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
const validateWrongRight = node => {
  validateBase(node);
  for (const key of ["x", "y", "width", "wrongText", "rightText"]) if (node[key] == null) throw new SceneCompileError(`wrong-right.${key} is required`);
};
const compileWrongRight = async (node, context) => {
  const text = (value, y, color, animations) => compileText({ text: value, x: node.x, y, fontSize: node.fontSize ?? 36, maxWidth: node.width, maxHeight: node.maxHeight ?? 140, maxLines: node.maxLines ?? 3, minFontSize: node.minFontSize ?? 24, overflowPolicy: "shrink", weight: "bold", color, lineSpacing: node.lineSpacing ?? 12, animations }, context);
  const label = (value, y, color, animations) => compileText({ text: value, x: node.x, y, fontSize: 26, weight: "bold", color, animations }, context);
  return [
    await label(node.wrongLabel ?? "SAI", node.y, node.wrongColor ?? "#E85D75", node.wrongAnimations),
    await text(node.wrongText, node.y + 50, node.wrongColor ?? "#E85D75", node.wrongAnimations),
    await label(node.rightLabel ?? "ĐÚNG", node.y, node.rightColor ?? "#2E8B57", node.rightAnimations),
    await text(node.rightText, node.y + 50, node.rightColor ?? "#2E8B57", node.rightAnimations),
  ].join(",");
};

const define = (type, input, validate, compile) => Object.freeze({ id: type, type, input: Object.freeze({ ...input, timeline: "animations" }), validate, compile });

export const componentRegistry = new Map([
  ["text", define("text", { layout: ["x", "y", "maxWidth", "maxHeight"], style: ["fontSize", "minFontSize", "maxLines", "weight", "color", "lineSpacing", "overflowPolicy", "alternateLayouts", "splitScene"], content: ["text"] }, validateBase, (node, context) => compileText(node, context))],
  ["box", define("box", { layout: ["x", "y", "width", "height"], style: ["color", "opacity"] }, validateBase, node => compileBox(node))],
  ["image", define("image", { layout: ["x", "y", "width", "height"], style: [], content: ["asset"] }, validateImage, (node, context) => compileImage(node, context))],
  ["progress", define("progress", { layout: ["x", "y", "width", "height"], style: ["background", "color"], content: ["value"] }, validateBase, node => compileProgress(node))],
  ["wrong-right", define("wrong-right", { layout: ["x", "y", "width", "maxHeight"], style: ["fontSize", "minFontSize", "maxLines", "lineSpacing", "wrongColor", "rightColor"], content: ["wrongText", "rightText", "wrongLabel", "rightLabel"] }, validateWrongRight, compileWrongRight)],
  ["group", define("group", { layout: [], style: [], content: ["children"] }, validateGroup, (node, { compileChildren }) => compileChildren(node.children))],
]);

export function resolveComponent(type) {
  const component = componentRegistry.get(type);
  if (!component) throw new SceneCompileError(`unknown scene primitive: ${type}`);
  return component;
}
