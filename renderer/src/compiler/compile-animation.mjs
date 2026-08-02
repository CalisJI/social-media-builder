const animations = new Set(["fade-in", "fade-out", "slide-up"]);

export class SceneCompileError extends Error {
  constructor(message) { super(message); this.status = 400; this.code = "invalid_scene"; }
}

const finite = (value, name) => {
  if (!Number.isFinite(value)) throw new SceneCompileError(`${name} must be a finite number`);
  return value;
};

export function compileAnimations(value = []) {
  if (!Array.isArray(value)) throw new SceneCompileError("animations must be an array");
  return value.map((animation, index) => {
    if (!animation || typeof animation !== "object" || Array.isArray(animation)) throw new SceneCompileError(`animations[${index}] must be an object`);
    if (!animations.has(animation.type)) throw new SceneCompileError(`unknown animation: ${animation.type}`);
    const start = finite(animation.start ?? 0, `animations[${index}].start`);
    const duration = finite(animation.duration ?? 0.3, `animations[${index}].duration`);
    if (start < 0 || duration <= 0) throw new SceneCompileError(`animations[${index}] must have a non-negative start and positive duration`);
    return { type: animation.type, start, duration, distance: animation.type === "slide-up" ? finite(animation.distance ?? 24, `animations[${index}].distance`) : 0 };
  });
}

export function animationExpressions(animations) {
  let alpha = "1";
  let yOffset = "0";
  for (const animation of animations) {
    const end = animation.start + animation.duration;
    if (animation.type === "fade-in") alpha = `(${alpha})*if(lt(t,${animation.start}),0,if(lt(t,${end}),(t-${animation.start})/${animation.duration},1))`;
    if (animation.type === "fade-out") alpha = `(${alpha})*if(lt(t,${animation.start}),1,if(lt(t,${end}),1-(t-${animation.start})/${animation.duration},0))`;
    if (animation.type === "slide-up") yOffset = `(${yOffset})+if(lt(t,${animation.start}),${animation.distance},if(lt(t,${end}),${animation.distance}*(1-(t-${animation.start})/${animation.duration}),0))`;
  }
  return { alpha, yOffset };
}
