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
  const x = number(node.x, "image.x"); const y = number(node.y, "image.y");
  return { prelude: `movie='${escapePath(asset)}',scale=w='${width}*(${animations.scale})':h='${height}*(${animations.scale})':eval=frame,format=rgba[${label}]`, filter: `[${label}]colorchannelmixer=aa='${animations.alpha}'[${label}a];[base][${label}a]overlay=x='${x}+${animations.xOffset}+(${width}-(${width}*${animations.scale}))/2':y='${y}+${animations.yOffset}+(${height}-(${height}*${animations.scale}))/2'[base]` };
}
