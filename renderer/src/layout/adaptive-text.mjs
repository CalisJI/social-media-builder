import { measureText, measureWrappedText, wrapMeasuredText } from "./text-measure.mjs";

export class TextOverflowError extends Error {
  constructor({ field, policy, value, measured, failedPolicy }) { super(`${field} cannot fit within its declared text layout policy`); this.name = "TextOverflowError"; this.code = "text_overflow"; this.status = 400; this.details = { field, maxLines: policy.maxLines, minFontSize: policy.minFontSize, length: Array.from(value).length, measured, failedPolicy }; }
}
const number = (value, fallback) => value === Infinity ? Infinity : Number.isFinite(value) ? Number(value) : fallback;
const layout = (value, options, size) => {
  const measured = measureWrappedText(value, { maxWidth: options.maxWidth, fontSize: size, lineHeight: size + options.lineSpacing });
  return { text: measured.lines.join("\n"), fontSize: size, lineCount: measured.lines.length, height: measured.height, measured: { width: measured.width, height: measured.height, lineCount: measured.lines.length, fontSize: size } };
};
const fits = (result, options) => result.lineCount <= options.maxLines && result.height <= options.maxHeight;
const truncate = (value, options) => {
  const lines = wrapMeasuredText(value, options).slice(0, options.maxLines); const last = lines.length - 1;
  while (lines[last] && measureText(`${lines[last]}…`, options.fontSize) > options.maxWidth) lines[last] = Array.from(lines[last]).slice(0, -1).join("");
  return { text: `${lines.join("\n")}…`, fontSize: options.fontSize, lineCount: lines.length, height: lines.length * (options.fontSize + options.lineSpacing), policy: "truncate", truncated: true };
};
export function resolveAdaptiveText({ value, field, policy }) {
  if (!policy || typeof policy !== "object") throw new TypeError(`missing text layout policy for ${field}`);
  const fontSize = number(policy.fontSize, 40), minFontSize = number(policy.minFontSize, fontSize), maxWidth = number(policy.maxWidth, 700), maxHeight = number(policy.maxHeight, Infinity), maxLines = number(policy.maxLines, 2), lineSpacing = number(policy.lineSpacing, 0);
  if (minFontSize <= 0 || minFontSize > fontSize || maxWidth <= 0 || maxHeight <= 0 || maxLines < 1 || lineSpacing < 0) throw new TypeError(`invalid text layout policy for ${field}`);
  const options = { maxWidth, maxHeight, maxLines, fontSize, minFontSize, lineSpacing };
  const mode = policy.mode ?? ((policy.alternates || policy.alternate) ? "alternate-layout" : policy.splitScene ? "split-scene" : "shrink");
  const tryFit = (smallest = minFontSize) => {
    let last;
    for (let size = fontSize; size >= smallest; size -= 1) { const result = layout(value, options, size); if (fits(result, options)) return result; last = result; }
    return last;
  };
  if (mode === "error" || mode === "wrap") {
    const result = tryFit(fontSize);
    if (fits(result, options)) return { ...result, policy: mode };
    throw new TextOverflowError({ field, policy: options, value, measured: result.measured, failedPolicy: mode });
  }
  if (mode === "shrink") {
    const result = tryFit();
    if (fits(result, options)) return { ...result, policy: "shrink" };
    throw new TextOverflowError({ field, policy: options, value, measured: result.measured, failedPolicy: mode });
  }
  if (mode === "alternate-layout") {
    for (const alternate of (policy.alternates ?? (policy.alternate ? [policy.alternate] : []))) {
      try { return { ...resolveAdaptiveText({ value, field, policy: alternate }), policy: policy.mode ? "alternate-layout" : "alternate" }; } catch (error) { if (!(error instanceof TextOverflowError)) throw error; }
    }
    const result = tryFit();
    throw new TextOverflowError({ field, policy: options, value, measured: result.measured, failedPolicy: mode });
  }
  if (mode === "split-scene") {
    if (!policy.splitScene) throw new TypeError(`split-scene policy for ${field} requires splitScene`);
    const split = { ...policy, ...policy.splitScene }; const sceneLines = number(split.maxLines, maxLines);
    for (let size = number(split.fontSize, fontSize); size >= number(split.minFontSize, minFontSize); size -= 1) {
      const measured = measureWrappedText(value, { maxWidth: number(split.maxWidth, maxWidth), fontSize: size });
      const scenes = []; for (let index = 0; index < measured.lines.length; index += sceneLines) scenes.push(measured.lines.slice(index, index + sceneLines).join("\n"));
      if (scenes.length <= number(split.maxScenes, Infinity)) return { text: scenes.join("\n"), fontSize: size, lineCount: measured.lines.length, scenes, policy: "split-scene" };
    }
  }
  if (mode === "truncate") {
    const result = tryFit(fontSize);
    return fits(result, options) ? { ...result, policy: "truncate", truncated: false } : truncate(value, options);
  }
  if (!["split-scene", "truncate"].includes(mode)) throw new TypeError(`unknown text overflow policy for ${field}: ${mode}`);
  const result = tryFit();
  throw new TextOverflowError({ field, policy: options, value, measured: result.measured, failedPolicy: mode });
}
export function resolveTextLayout(fields, policies) { return Object.fromEntries(Object.entries(fields).map(([field, value]) => [field, resolveAdaptiveText({ value, field, policy: policies[field] })])); }
