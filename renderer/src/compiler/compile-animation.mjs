const animations = new Set(["none", "fade", "rise", "slide-left", "slide-right", "scale", "fade-in", "fade-out", "slide-up"]);

export class SceneCompileError extends Error {
  constructor(message) { super(message); this.status = 400; this.code = "invalid_template"; }
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
    return {
      type: animation.type,
      start,
      duration,
      distance: ["rise", "slide-left", "slide-right", "slide-up"].includes(animation.type) ? finite(animation.distance ?? 24, `animations[${index}].distance`) : 0,
      from: animation.type === "scale" ? finite(animation.from ?? 0.9, `animations[${index}].from`) : 1,
    };
  });
}

export function animationExpressions(animations) {
  let alpha = "1";
  const xOffsets = [];
  const yOffsets = [];
  let scale = "1";
  for (const animation of animations) {
    const end = animation.start + animation.duration;
    if (["fade", "fade-in"].includes(animation.type)) alpha = `(${alpha})*if(lt(t,${animation.start}),0,if(lt(t,${end}),(t-${animation.start})/${animation.duration},1))`;
    if (animation.type === "fade-out") alpha = `(${alpha})*if(lt(t,${animation.start}),1,if(lt(t,${end}),1-(t-${animation.start})/${animation.duration},0))`;
    if (["rise", "slide-up"].includes(animation.type)) yOffsets.push(`if(lt(t,${animation.start}),${animation.distance},if(lt(t,${end}),${animation.distance}*(1-(t-${animation.start})/${animation.duration}),0))`);
    if (animation.type === "slide-left") xOffsets.push(`if(lt(t,${animation.start}),${animation.distance},if(lt(t,${end}),${animation.distance}*(1-(t-${animation.start})/${animation.duration}),0))`);
    if (animation.type === "slide-right") xOffsets.push(`if(lt(t,${animation.start}),-${animation.distance},if(lt(t,${end}),-${animation.distance}*(1-(t-${animation.start})/${animation.duration}),0))`);
    if (animation.type === "scale") scale = `if(lt(t,${animation.start}),${animation.from},if(lt(t,${end}),${animation.from}+(1-${animation.from})*(t-${animation.start})/${animation.duration},1))`;
  }
  return { alpha, xOffset: xOffsets.join("+") || "0", yOffset: yOffsets.join("+") || "0", scale };
}
