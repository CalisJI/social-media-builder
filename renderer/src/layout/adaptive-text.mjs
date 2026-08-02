import { measureWrappedText } from "./text-measure.mjs";

export class TextOverflowError extends Error {
  constructor({ field, policy, value }) { super(`${field} cannot fit within its declared text layout policy`); this.name = "TextOverflowError"; this.code = "text_overflow"; this.status = 400; this.details = { field, maxLines: policy.maxLines, minFontSize: policy.minFontSize, length: Array.from(value).length }; }
}
const number = (value, fallback) => Number.isFinite(value) ? Number(value) : fallback;
export function resolveAdaptiveText({ value, field, policy }) {
  if (!policy || typeof policy !== "object") throw new TypeError(`missing text layout policy for ${field}`);
  const fontSize = number(policy.fontSize, 40), minFontSize = number(policy.minFontSize, fontSize), maxWidth = number(policy.maxWidth, 700), maxLines = number(policy.maxLines, 2);
  if (minFontSize <= 0 || minFontSize > fontSize || maxWidth <= 0 || maxLines < 1) throw new TypeError(`invalid text layout policy for ${field}`);
  for (let size = fontSize; size >= minFontSize; size -= 1) { const measured = measureWrappedText(value, { maxWidth, fontSize: size }); if (measured.lines.length <= maxLines) return { text: measured.lines.join("\n"), fontSize: size, lineCount: measured.lines.length, policy: "wrap-shrink" }; }
  for (const alternate of (policy.alternates ?? (policy.alternate ? [policy.alternate] : []))) {
    try { return { ...resolveAdaptiveText({ value, field, policy: alternate }), policy: "alternate" }; } catch (error) { if (!(error instanceof TextOverflowError)) throw error; }
  }
  if (policy.splitScene) {
    const split = { ...policy, ...policy.splitScene }; const sceneLines = number(split.maxLines, maxLines);
    for (let size = number(split.fontSize, fontSize); size >= number(split.minFontSize, minFontSize); size -= 1) {
      const measured = measureWrappedText(value, { maxWidth: number(split.maxWidth, maxWidth), fontSize: size });
      const scenes = []; for (let index = 0; index < measured.lines.length; index += sceneLines) scenes.push(measured.lines.slice(index, index + sceneLines).join("\n"));
      if (scenes.length <= number(split.maxScenes, Infinity)) return { text: scenes.join("\n"), fontSize: size, lineCount: measured.lines.length, scenes, policy: "split-scene" };
    }
  }
  throw new TextOverflowError({ field, policy: { maxLines, minFontSize }, value });
}
export function resolveTextLayout(fields, policies) { return Object.fromEntries(Object.entries(fields).map(([field, value]) => [field, resolveAdaptiveText({ value, field, policy: policies[field] })])); }
