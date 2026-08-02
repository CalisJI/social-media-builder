import path from "node:path";
import { SceneCompileError, animationExpressions, compileAnimations } from "./compile-animation.mjs";

const number = (value, name, minimum = 0) => {
  if (!Number.isFinite(value) || value < minimum) throw new SceneCompileError(`${name} must be a number >= ${minimum}`);
  return value;
};
const escapePath = value => value.replaceAll("\\", "/").replaceAll(":", "\\:").replaceAll("'", "\\'");
const contained = (root, candidate) => { const relative = path.relative(root, candidate); return relative && !relative.startsWith("..") && !path.isAbsolute(relative); };

export function compileImage(node, { packageRoot, nextId }) {
  if (typeof node.asset !== "string" || !node.asset) throw new SceneCompileError("image.asset must be a non-empty relative path");
  const asset = path.resolve(packageRoot, node.asset);
  if (!contained(packageRoot, asset)) throw new SceneCompileError(`unsafe image asset path: ${node.asset}`);
  const animations = animationExpressions(compileAnimations(node.animations));
  const label = `scene_image_${nextId()}`;
  const width = number(node.width, "image.width", 1); const height = number(node.height, "image.height", 1);
  return { prelude: `movie='${escapePath(asset)}',scale=${width}:${height},format=rgba[${label}]`, filter: `[${label}]colorchannelmixer=aa='${animations.alpha}'[${label}a];[base][${label}a]overlay=x=${number(node.x, "image.x")}:y='${number(node.y, "image.y")}+${animations.yOffset}'[base]` };
}
