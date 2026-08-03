import { SceneCompileError, animationExpressions, compileAnimations } from "./compile-animation.mjs";

const number = (value, name, minimum = 0) => {
  if (!Number.isFinite(value) || value < minimum) throw new SceneCompileError(`${name} must be a number >= ${minimum}`);
  return value;
};
const color = (value, name) => {
  if (typeof value !== "string" || !/^#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?$/.test(value)) throw new SceneCompileError(`${name} must be a hexadecimal color`);
  return value;
};

export function compileBox(node) {
  const animations = animationExpressions(compileAnimations(node.animations));
  const opacity = node.opacity == null ? 1 : number(node.opacity, "box.opacity");
  if (opacity > 1) throw new SceneCompileError("box.opacity must be <= 1");
  return `drawbox=x=${number(node.x, "box.x")}:y='${number(node.y, "box.y")}+${animations.yOffset}':w=${number(node.width, "box.width", 1)}:h=${number(node.height, "box.height", 1)}:color=${color(node.color, "box.color")}@${opacity}:t=fill:replace=1:enable='gte(t,0)',format=rgba,colorchannelmixer=aa='${animations.alpha}'`;
}

export function compileProgress(node) {
  const x = number(node.x, "progress.x"); const y = number(node.y, "progress.y"); const width = number(node.width, "progress.width", 1); const height = number(node.height, "progress.height", 1);
  const value = number(node.value, "progress.value"); if (value > 1) throw new SceneCompileError("progress.value must be <= 1");
  const animations = animationExpressions(compileAnimations(node.animations));
  const background = color(node.background, "progress.background"); const foreground = color(node.color, "progress.color");
  return `drawbox=x=${x}:y='${y}+${animations.yOffset}':w=${width}:h=${height}:color=${background}:t=fill,drawbox=x=${x}:y='${y}+${animations.yOffset}':w=${width * value}:h=${height}:color=${foreground}:t=fill,colorchannelmixer=aa='${animations.alpha}'`;
}
