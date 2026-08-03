export class SplitSceneError extends Error {
  constructor(message) { super(message); this.status = 400; this.code = "invalid_split_scene"; }
}

const finite = (value, name) => {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) throw new SplitSceneError(`${name} must be a positive number`);
  return number;
};

export function resolveSplitScene({ strategy, stages, stageId, parts }) {
  const allowed = strategy?.splitScene === true || strategy?.splitScene?.includes(stageId);
  if (!allowed) throw new SplitSceneError(`strategy ${strategy?.id || "unknown"} does not allow split scenes for stage ${stageId}`);
  if (!Array.isArray(parts) || parts.length < 2 || parts.some(part => typeof part !== "string" || !part)) throw new SplitSceneError("split scene requires at least two non-empty parts");
  const maximumDuration = finite(strategy.duration?.max, "strategy.duration.max");
  const index = stages.findIndex(stage => stage.id === stageId);
  if (index < 0) throw new SplitSceneError(`unknown split stage: ${stageId}`);
  const target = stages[index];
  const duration = finite(target.duration, `stage ${stageId}.duration`);
  const extraDuration = duration * (parts.length - 1);
  const timeline = stages.flatMap((stage, position) => {
    if (position === index) return parts.map((value, sceneIndex) => ({ ...stage, id: `${stage.id}-${sceneIndex + 1}`, start: stage.start + sceneIndex * duration, value, splitScene: sceneIndex + 1 }));
    return [{ ...stage, start: position > index ? stage.start + extraDuration : stage.start }];
  });
  const totalDuration = Math.max(...timeline.map(stage => stage.start + stage.duration));
  const cta = timeline.find(stage => stage.role === "cta");
  if (!cta || cta.duration <= 0 || cta.start + cta.duration > totalDuration) throw new SplitSceneError("split scene must retain a visible CTA");
  if (totalDuration > maximumDuration) throw new SplitSceneError(`split scene duration ${totalDuration} exceeds strategy maximum ${maximumDuration}`);
  return {
    stages: timeline,
    warnings: [{ code: "split_scene", stageId, sceneCount: parts.length }],
    metadata: { split_scene: { stage_id: stageId, scene_count: parts.length, duration: totalDuration } },
  };
}