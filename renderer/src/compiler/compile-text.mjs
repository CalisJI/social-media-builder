import { SceneCompileError, animationExpressions, compileAnimations } from "./compile-animation.mjs";
import { resolveAdaptiveText } from "../layout/adaptive-text.mjs";

const weights = new Set(["regular", "medium", "bold", "extraBold"]);
const color = value => {
  if (typeof value !== "string" || !/^#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?$/.test(value)) throw new SceneCompileError("text.color must be a hexadecimal color");
  return value;
};
const number = (value, name, minimum = 0) => {
  if (!Number.isFinite(value) || value < minimum) throw new SceneCompileError(`${name} must be a number >= ${minimum}`);
  return value;
};

export function interpolateText(value, context) {
  if (typeof value !== "string") throw new SceneCompileError("text.text must be a string");
  return value.replace(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g, (_, key) => {
    if (!(key in context) || typeof context[key] !== "string") throw new SceneCompileError(`unknown text binding: ${key}`);
    return context[key];
  });
}

export async function compileText(node, { font, saveText, context, nextId }) {
  const x = number(node.x, "text.x"); const y = number(node.y, "text.y"); const fontSize = number(node.fontSize, "text.fontSize", 1);
  const weight = node.weight ?? "regular";
  if (!weights.has(weight)) throw new SceneCompileError(`unknown text.weight: ${weight}`);
  const animations = animationExpressions(compileAnimations(node.animations));
  const lineSpacing = node.lineSpacing == null ? 0 : number(node.lineSpacing, "text.lineSpacing");
  const bounds = [node.maxWidth, node.maxHeight, node.minFontSize, node.maxLines].some(value => value != null);
  if (bounds && (node.maxWidth == null || node.maxHeight == null)) throw new SceneCompileError("text adaptive layout requires maxWidth and maxHeight");
  const layout = bounds ? resolveAdaptiveText({ value: interpolateText(node.text, context), field: "text", policy: { fontSize, minFontSize: node.minFontSize ?? fontSize, maxWidth: number(node.maxWidth, "text.maxWidth", 1), maxHeight: number(node.maxHeight, "text.maxHeight", 1), maxLines: node.maxLines ?? Infinity, lineSpacing, mode: node.overflowPolicy, alternates: node.alternateLayouts, splitScene: node.splitScene } }) : { text: interpolateText(node.text, context), fontSize };
  const file = await saveText(`scene-${nextId()}`, layout.text);
  const spacing = node.lineSpacing == null ? "" : `:line_spacing=${lineSpacing}`;
  return `drawtext=fontfile='${font[weight]}':textfile='${file}':fontcolor=${color(node.color)}:fontsize='${layout.fontSize}*(${animations.scale})':x='${x}+${animations.xOffset}':y='${y}+${animations.yOffset}':alpha='${animations.alpha}'${spacing}`;
}
