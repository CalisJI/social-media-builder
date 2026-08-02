import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { access, cp, mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeRenderJob } from "./model/normalize-render-job.mjs";
import { ConstraintError, resolveConstraints } from "./validation/resolve-constraints.mjs";
import { resolveTemplateEngine } from "./template/resolve-template-engine.mjs";
import { defaultStrategyId, resolveStrategy } from "./strategy/resolve-strategy.mjs";
import { TextOverflowError, resolveTextLayout } from "./layout/adaptive-text.mjs";

export { validateStrategy } from "./strategy/resolve-strategy.mjs";

const rendererRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const templatesRoot = path.resolve(process.env.RENDER_TEMPLATES_DIR || path.join(rendererRoot, "../templates"));
const partLabels = { adjective: "tính từ", adverb: "trạng từ", noun: "danh từ", verb: "động từ", preposition: "giới từ", pronoun: "đại từ" };
const defaultCopy = Object.freeze({
  hook: "TỪ NÀY NGHĨA LÀ GÌ?",
  meaningLabel: "NGHĨA TIẾNG VIỆT",
  exampleLabel: "VÍ DỤ",
  cta: "Follow {handle} • 1 từ mỗi ngày",
});
const defaultTimeline = Object.freeze({
  hook: [0, 0.55],
  word: [0.8, 0.45],
  meaning: [2.2, 0.5],
  example: [4, 0.5],
  cta: [7.2, 0.65],
});

export class RenderError extends Error {
  constructor(message, status = 500, code = "render_failed", details) { super(message); this.status = status; this.code = code; if (details) this.details = details; }
}
const defaultTextLayout = Object.freeze({ meaning: { maxWidth: 760, maxLines: 3, fontSize: 44, minFontSize: 30 }, en: { maxWidth: 760, maxLines: 2, fontSize: 36, minFontSize: 26 }, vi: { maxWidth: 760, maxLines: 2, fontSize: 30, minFontSize: 22 } });

function clean(value, name, constraint, { required = true, fallback = null } = {}) {
  if (value == null || (typeof value === "string" && !value.trim())) {
    if (!required) return fallback;
    throw new RenderError(`${name} is required`, 400, "invalid_payload");
  }
  if (typeof value !== "string") throw new RenderError(`${name} must be a string`, 400, "invalid_payload");
  const result = value.trim().replace(/\s+/g, " ");
  if (constraint && result.length > constraint.maxLength) throw new RenderError(`${name} violates constraints.maxLength (${constraint.maxLength}): received ${result.length} characters`, 400, "invalid_payload");
  return result;
}

function contained(root, candidate) { const rel = path.relative(root, candidate); return rel && !rel.startsWith("..") && !path.isAbsolute(rel); }
function mergeObject(base = {}, override = {}) { return { ...base, ...(override && typeof override === "object" ? override : {}) }; }
function normalizeTimeline(value) {
  const timeline = mergeObject(defaultTimeline, value);
  for (const key of ["hook", "word", "meaning", "example", "cta"]) {
    const entry = timeline[key];
    if (!Array.isArray(entry) || entry.length !== 2 || !entry.every((part) => Number.isFinite(Number(part)))) {
      throw new RenderError(`template timeline.${key} must contain [start, duration]`, 400, "invalid_template");
    }
    timeline[key] = [Number(entry[0]), Number(entry[1])];
  }
  return timeline;
}
function normalizeCopy(value) {
  const copy = mergeObject(defaultCopy, value);
  for (const key of ["hook", "meaningLabel", "exampleLabel", "cta"]) {
    if (typeof copy[key] !== "string" || !copy[key].trim()) {
      throw new RenderError(`template copy.${key} must be a non-empty string`, 400, "invalid_template");
    }
  }
  return copy;
}

export async function loadTemplateRegistry(root = templatesRoot) {
  const registry = new Map();
  for (const item of await readdir(root, { withFileTypes: true })) {
    if (!item.isDirectory()) continue;
    const packageRoot = path.join(root, item.name); let manifest;
    try { manifest = JSON.parse(await readFile(path.join(packageRoot, "manifest.json"), "utf8")); } catch (error) { if (error.code === "ENOENT") continue; throw error; }
    if (!manifest.id || registry.has(manifest.id)) throw new RenderError(`invalid or duplicate template id: ${manifest.id || item.name}`);
    manifest.engine = resolveTemplateEngine(manifest).id;
    for (const key of ["background", "petal"]) {
      const resolved = path.resolve(packageRoot, manifest.assets?.[key] || "");
      if (!contained(root, resolved)) throw new RenderError(`template ${manifest.id} has unsafe ${key} path`);
      await access(resolved); manifest.assets[key] = resolved;
    }
    const themePath = path.join(packageRoot, "theme.json");
    try {
      const theme = JSON.parse(await readFile(themePath, "utf8"));
      if (theme && typeof theme === "object" && !Array.isArray(theme)) {
        if (theme.palette) manifest.palette = mergeObject(manifest.palette, theme.palette);
        if (theme.layout) manifest.layout = mergeObject(manifest.layout, theme.layout);
        if (theme.timeline) manifest.timeline = normalizeTimeline(mergeObject(manifest.timeline, theme.timeline));
        if (theme.copy) manifest.copy = normalizeCopy(mergeObject(manifest.copy, theme.copy));
      } else {
        throw new RenderError(`template ${manifest.id} theme file must be a JSON object`, 400, "invalid_template");
      }
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    manifest.copy = normalizeCopy(manifest.copy);
    manifest.timeline = normalizeTimeline(manifest.timeline);
    try { manifest.constraints = resolveConstraints(manifest.constraints); } catch (error) {
      if (error instanceof ConstraintError) throw new RenderError(`template ${manifest.id} ${error.message}`, 400, "invalid_template");
      throw error;
    }
    const [left, top, right, bottom] = manifest.layout?.safeZone || [];
    if (!(left >= 0 && top >= 0 && right <= 1080 && bottom <= 1920 && left < right && top < bottom)) throw new RenderError(`template ${manifest.id} has invalid safe zone`);
    manifest.packageRoot = packageRoot; registry.set(manifest.id, Object.freeze(manifest));
  }
  return registry;
}

let registryPromise;
export async function getTemplateRegistry() { return registryPromise ||= loadTemplateRegistry(); }
export async function resolveTemplate(id) {
  const template = (await getTemplateRegistry()).get(id);
  if (!template) throw new RenderError(`unknown template_id: ${id}`, 400, "unknown_template");
  return template;
}

const activeTemplatePath = () => path.join(process.env.RENDER_OUTPUT_DIR || "/data/renders", "active-template.json");
async function activeTemplateId() {
  try {
    const { id } = JSON.parse(await readFile(activeTemplatePath(), "utf8"));
    return typeof id === "string" && id.trim() ? id.trim() : null;
  } catch { return null; }
}

export async function importTemplate({ id, baseTemplateId = "vocabulary-dark-reference-v1", theme }) {
  if (typeof id !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*-v[1-9][0-9]*$/.test(id)) throw new RenderError("template id must be a versioned lowercase slug", 400, "invalid_template");
  if (!theme || typeof theme !== "object" || Array.isArray(theme)) throw new RenderError("theme must be a JSON object", 400, "invalid_template");
  const base = await resolveTemplate(baseTemplateId);
  const target = path.join(templatesRoot, id); const temp = `${target}.tmp-${process.pid}`;
  try { await access(target); throw new RenderError(`template already exists: ${id}`, 409, "template_exists"); } catch (error) { if (error.code !== "ENOENT") throw error; }
  await rm(temp, { recursive: true, force: true });
  try {
    await cp(base.packageRoot, temp, { recursive: true });
    const manifest = JSON.parse(await readFile(path.join(temp, "manifest.json"), "utf8"));
    manifest.id = id;
    await writeFile(path.join(temp, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    await writeFile(path.join(temp, "theme.json"), `${JSON.stringify(theme, null, 2)}\n`, "utf8");
    await rename(temp, target); registryPromise = undefined;
    await resolveTemplate(id);
    await mkdir(path.dirname(activeTemplatePath()), { recursive: true });
    await writeFile(activeTemplatePath(), `${JSON.stringify({ id })}\n`, "utf8");
    return { id, baseTemplateId };
  } catch (error) { await rm(temp, { recursive: true, force: true }); await rm(target, { recursive: true, force: true }); registryPromise = undefined; throw error; }
}

export async function normalizePayload(input) {
  input = normalizeRenderJob(input);
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new RenderError("JSON object required", 400, "invalid_payload");
  const entry = Array.isArray(input.entries) ? input.entries[0] : input.entry ?? input;
  if (!entry || (Array.isArray(input.entries) && input.entries.length !== 1)) throw new RenderError("exactly one vocabulary entry is required", 400, "invalid_payload");
  const requestedTemplate = [input.template_id, input.template_key, await activeTemplateId(), process.env.RENDER_DEFAULT_TEMPLATE_ID, "vocabulary-pastel-v1"]
    .find((value) => typeof value === "string" && value.trim());
  const template = await resolveTemplate(clean(requestedTemplate, "template_id", null));
  const duration = Number(input.duration_seconds ?? 10);
  if (!Number.isFinite(duration) || duration < 9.8 || duration > 10.2) throw new RenderError("duration_seconds must be between 9.8 and 10.2", 400, "invalid_payload");
  const handle = clean(input.brand_handle ?? input.channel_handle, "brand_handle", template.constraints.brand_handle);
  if (!/^@[A-Za-z0-9._]+$/.test(handle)) throw new RenderError("brand_handle must start with @ and contain only letters, numbers, dot or underscore", 400, "invalid_payload");
  const ipa = clean(entry.ipa, "ipa", template.constraints.ipa, { required: false, fallback: "Phát âm đang cập nhật" });
  const part = clean(entry.part_of_speech, "part_of_speech", template.constraints.part_of_speech, { required: false, fallback: "từ vựng" });
  const ctaTemplate = template.copy?.cta || defaultCopy.cta;
  const strategy = await resolveStrategy(input.strategy_id ?? defaultStrategyId, { content: entry, capabilities: template.capabilities ?? [] });
  return {
    template: template.id, strategy: strategy.id, duration, word: clean(entry.word, "word", template.constraints.word), ipa,
    part: partLabels[part.toLowerCase()] || part, meaning: clean(entry.meaning_vi, "meaning_vi", template.constraints.meaning_vi),
    exampleEn: clean(entry.example_en, "example_en", template.constraints.example_en, { required: false, fallback: "Ví dụ đang cập nhật" }),
    exampleVi: clean(entry.example_vi, "example_vi", template.constraints.example_vi, { required: false, fallback: "" }),
    handle, cta: clean(entry.cta ?? input.cta, "cta", template.constraints.cta, { required: false, fallback: ctaTemplate.replaceAll("{handle}", handle) }),
    pronunciationAudioUrl: entry.pronunciation_audio_url ?? input.pronunciation_audio_url ?? null,
    backgroundMusicUrl: entry.background_music_url ?? input.background_music_url ?? null,
  };
}

export function payloadHash(payload) { return createHash("sha256").update(JSON.stringify(payload)).digest("hex"); }
const escapePath = value => value.replaceAll("\\", "/").replaceAll(":", "\\:").replaceAll("'", "'\\''");
async function saveText(dir, name, value) { const file = path.join(dir, `${name}.txt`); await writeFile(file, value, "utf8"); return escapePath(file); }
export function wrapText(value, columns, maxLines = Infinity) {
  const words = value.split(/\s+/); const lines = []; let line = "";
  for (const word of words) { const next = line ? `${line} ${word}` : word; if (next.length <= columns || !line) line = next; else { lines.push(line); line = word; } }
  if (line) lines.push(line); if (lines.length > maxLines) throw new RenderError(`text exceeds ${maxLines} lines`, 400, "text_overflow"); return lines.join("\n");
}
export function prepareTextLayout(payload, template) {
  const policy = mergeObject(defaultTextLayout, template.layout?.text);
  try { return resolveTextLayout({ meaning: payload.meaning, en: payload.exampleEn, ...(payload.exampleVi ? { vi: payload.exampleVi } : {}) }, policy); }
  catch (error) { if (error instanceof TextOverflowError) throw new RenderError(error.message, error.status, error.code, error.details); throw error; }
}
const rise = (start, duration, amount) => `if(lt(t,${start}),${amount},if(lt(t,${start + duration}),${amount}*(1-(t-${start})/${duration}),0))`;
const fade = (start, duration) => `if(lt(t,${start}),0,if(lt(t,${start + duration}),(t-${start})/${duration},1))`;

async function fonts() {
  const result = {
    regular: process.env.RENDER_FONT_REGULAR || "/usr/share/fonts/noto/NotoSans-Regular.ttf",
    medium: process.env.RENDER_FONT_MEDIUM || "/usr/share/fonts/noto/NotoSans-Medium.ttf",
    bold: process.env.RENDER_FONT_BOLD || "/usr/share/fonts/noto/NotoSans-Bold.ttf",
    extraBold: process.env.RENDER_FONT_EXTRABOLD || "/usr/share/fonts/noto/NotoSans-ExtraBold.ttf",
  };
  for (const [weight, file] of Object.entries(result)) { try { await access(file); } catch { throw new RenderError(`required Noto Sans ${weight} font failed to load: ${file}`, 500, "font_load_failed"); } }
  return Object.fromEntries(Object.entries(result).map(([key, value]) => [key, escapePath(value)]));
}

function darkSlideStages({ template, font, files, payload, textLayout, hookStart, hookDuration, wordStart, wordDuration, meaningStart, meaningDuration, exampleStart, exampleDuration, ctaStart, ctaDuration }) {
  const p = template.palette;
  const dt = (file, weight, size, x, y, opts = "") => `drawtext=fontfile='${font[weight]}':textfile='${file}':fontcolor=${p.ink}:fontsize=${size}:x='${x}':y='${y}'${opts}`;
  return [
    "[0:v]scale=1160:2062,crop=1080:1920:x='40+12*t/10':y='71+18*t/10',setsar=1[bg]",
    "[bg]drawbox=x=420:y=100:w=16:h=16:color=#645d68:t=fill,drawbox=x=450:y=100:w=16:h=16:color=#645d68:t=fill,drawbox=x=480:y=100:w=48:h=16:color=#FF595E:t=fill,drawbox=x=540:y=100:w=16:h=16:color=#645d68:t=fill,drawbox=x=570:y=100:w=16:h=16:color=#645d68:t=fill,drawbox=x=600:y=100:w=16:h=16:color=#645d68:t=fill,drawbox=x=630:y=100:w=16:h=16:color=#645d68:t=fill,drawbox=x=660:y=100:w=16:h=16:color=#645d68:t=fill[decor]",
    `[decor]drawbox=x=84:y=238:w=146:h=114:color=${p.card}:t=fill,drawbox=x=85:y=239:w=144:h=112:color=${p.accent}:t=3[badge]`,
    `[badge]${dt(files.step, "extraBold", 64, 112, 256, `:fontcolor=#F3BF9A:alpha='${fade(hookStart, hookDuration)}'`)}`,
    dt(files.hook, "extraBold", 68, 84, `470+${rise(hookStart, hookDuration, 30)}`, `:alpha='${fade(hookStart, hookDuration)}'`),
    dt(files.word, "extraBold", 78, 84, `590+${rise(wordStart, wordDuration, 30)}`, `:fontcolor=${p.accent}:alpha='${fade(wordStart, wordDuration)}'`),
    `drawtext=fontfile='${font.bold}':text='•':fontcolor=${p.secondary}:fontsize=58:x=84:y=760:alpha='${fade(meaningStart, meaningDuration)}'`,
    dt(files.meaning, "bold", textLayout.meaning.fontSize, 120, `765+${rise(meaningStart, meaningDuration, 24)}`, `:line_spacing=14:fontcolor=${p.secondary}:alpha='${fade(meaningStart, meaningDuration)}'`),
    `drawbox=x=86:y=1070:w=690:h=98:color=${p.card}:t=fill:enable='gte(t,${exampleStart})'`,
    dt(files.ipa, "medium", 34, 108, `1101+${rise(exampleStart, exampleDuration, 20)}`, `:fontcolor=#EF8C87:alpha='${fade(exampleStart, exampleDuration)}'`),
    `drawtext=fontfile='${font.bold}':text='•':fontcolor=${p.secondary}:fontsize=58:x=84:y=1240:alpha='${fade(exampleStart + 0.15, exampleDuration)}'`,
    dt(files.en, "bold", textLayout.en.fontSize, 120, `1245+${rise(exampleStart + 0.15, exampleDuration, 24)}`, `:line_spacing=12:fontcolor=${p.secondary}:alpha='${fade(exampleStart + 0.15, exampleDuration)}'`),
    ...(payload.exampleVi ? [dt(files.vi, "medium", textLayout.vi.fontSize, 120, `1400+${rise(exampleStart + 0.3, exampleDuration, 20)}`, `:fontcolor=${p.secondary}:line_spacing=9:alpha='${fade(exampleStart + 0.3, exampleDuration)}'`)] : []),
    dt(files.cta, "bold", 34, "(w-text_w)/2", `1660+${rise(ctaStart, ctaDuration, 36)}`, `:fontcolor=#7F81A7:alpha='${fade(ctaStart, ctaDuration)}'`),
    "format=yuv420p[out]",
  ];
}

export async function renderVideo(payload, outputFile, { ffmpeg = process.env.FFMPEG_PATH || "ffmpeg", timeoutMs = Number(process.env.RENDER_TIMEOUT_MS || 120000) } = {}) {
  const template = await resolveTemplate(payload.template); const font = await fonts(); const work = `${outputFile}.work`;
  await rm(work, { recursive: true, force: true }); await mkdir(work, { recursive: true });
  const textLayout = prepareTextLayout(payload, template);
  const display = { step: "01", hook: template.copy?.hook || defaultCopy.hook, word: payload.word.toUpperCase(), ipa: payload.ipa, part: payload.part, meaningLabel: template.copy?.meaningLabel || defaultCopy.meaningLabel, meaning: textLayout.meaning.text, exampleLabel: template.copy?.exampleLabel || defaultCopy.exampleLabel, en: textLayout.en.text, vi: textLayout.vi?.text || "", cta: payload.cta };
  const files = {}; for (const [key, value] of Object.entries(display)) files[key] = await saveText(work, key, value);
  const p = template.palette; const dt = (file, weight, size, x, y, opts = "") => `drawtext=fontfile='${font[weight]}':textfile='${file}':fontcolor=${p.ink}:fontsize=${size}:x='${x}':y='${y}'${opts}`;
  const [hookStart, hookDuration] = template.timeline?.hook || defaultTimeline.hook;
  const [wordStart, wordDuration] = template.timeline?.word || defaultTimeline.word;
  const [meaningStart, meaningDuration] = template.timeline?.meaning || defaultTimeline.meaning;
  const [exampleStart, exampleDuration] = template.timeline?.example || defaultTimeline.example;
  const [ctaStart, ctaDuration] = template.timeline?.cta || defaultTimeline.cta;
  const stages = template.layout?.variant === "dark-slide" ? darkSlideStages({ template, font, files, payload, textLayout, hookStart, hookDuration, wordStart, wordDuration, meaningStart, meaningDuration, exampleStart, exampleDuration, ctaStart, ctaDuration }) : [
    "[0:v]scale=1160:2062,crop=1080:1920:x='40+20*t/10':y='71+35*t/10',setsar=1[bg]",
    `[1:v]scale=96:96,format=rgba,rotate='-0.10+0.20*t/10':ow=rotw(iw):oh=roth(ih):c=none[petal]`,
    "[bg][petal]overlay=x=55:y='330+32*t/10'[decor]",
    `[decor]drawbox=x='96+18*max(0\,1-t/1.17)':y='300+23*max(0\,1-t/1.17)':w='888-36*max(0\,1-t/1.17)':h='1150-46*max(0\,1-t/1.17)':color=${p.card}@0.96:t=fill`,
    dt(files.hook,"bold",36,"(w-text_w)/2",`230+${rise(hookStart,hookDuration,36)}`,`:alpha='${fade(hookStart,hookDuration)}'`),
    dt(files.word,"extraBold",104,"(w-text_w)/2",`405+${rise(wordStart,wordDuration,28)}`,`:alpha='${fade(wordStart,wordDuration)}'`),
    `drawbox=x=160:y=540:w='min(680\,680*max(0\,min(1\,(t-1.15)/0.2)))':h=8:color=${p.accent}:t=fill:enable='gte(t,1.15)'`,
    `drawbox=x=210:y=565:w=620:h=64:color=${p.ipa}:t=fill:enable='gte(t,1.05)'`,
    dt(files.ipa,"regular",38,"(w-text_w)/2",575,`:alpha='${fade(1.05,0.4)}'`),
    dt(files.part,"bold",30,"(w-text_w)/2",646,`:fontcolor=${p.accent}:alpha='${fade(1.25,0.4)}'`),
    dt(files.meaningLabel,"bold",26,148,`748+${rise(meaningStart,meaningDuration,26)}`,`:alpha='${fade(meaningStart,meaningDuration)}'`),
    dt(files.meaning,"bold",textLayout.meaning.fontSize,148,`797+${rise(meaningStart + 0.15,meaningDuration + 0.05,30)}`,`:line_spacing=8:alpha='${fade(meaningStart + 0.15,meaningDuration + 0.05)}'`),
    dt(files.exampleLabel,"bold",26,148,`1005+${rise(exampleStart,exampleDuration,24)}`,`:alpha='${fade(exampleStart,exampleDuration)}'`),
    dt(files.en,"medium",textLayout.en.fontSize,148,`1054+${rise(exampleStart + 0.15,exampleDuration + 0.05,28)}`,`:line_spacing=8:alpha='${fade(exampleStart + 0.15,exampleDuration + 0.05)}'`),
    ...(payload.exampleVi ? [dt(files.vi,"medium",textLayout.vi.fontSize,148,`1176+${rise(exampleStart + 0.35,exampleDuration + 0.05,24)}`,`:fontcolor=${p.secondary}:line_spacing=7:alpha='${fade(exampleStart + 0.35,exampleDuration + 0.05)}'`)] : []),
    `drawbox=x=160:y='1320+${rise(ctaStart,ctaDuration,48)}':w=720:h=104:color=${p.card}:t=fill:enable='gte(t,${ctaStart})'`,
    dt(files.cta,"bold",34,"(w-text_w)/2",`1350+${rise(ctaStart,ctaDuration,48)}`,`:alpha='${fade(ctaStart,ctaDuration)}'`),
    "format=yuv420p[out]"
  ];
  const filter = `${stages.slice(0, 3).join(";")};${stages.slice(3).join(",")}`;
  const temp = `${outputFile}.tmp.mp4`; await mkdir(path.dirname(outputFile), { recursive: true });
  const visualInputs = template.layout?.variant === "dark-slide" ? ["-loop", "1", "-i", template.assets.background] : ["-loop", "1", "-i", template.assets.background, "-loop", "1", "-i", template.assets.petal];
  const visualInputCount = template.layout?.variant === "dark-slide" ? 1 : 2;
  const audioInputs = payload.backgroundMusicUrl ? ["-stream_loop", "-1", "-i", payload.backgroundMusicUrl] : [];
  const audioOutput = payload.backgroundMusicUrl ? ["-map", `${visualInputCount}:a:0`, "-c:a", "aac", "-b:a", process.env.RENDER_AUDIO_BITRATE || "128k"] : ["-an"];
  const args = ["-hide_banner","-loglevel","error",...visualInputs,...audioInputs,"-filter_complex",filter,"-map","[out]",...audioOutput,"-t",String(payload.duration),"-c:v","libx264","-profile:v","high","-preset",process.env.RENDER_PRESET||"medium","-crf",process.env.RENDER_CRF||"20","-pix_fmt","yuv420p","-movflags","+faststart","-r","30","-y",temp];
  try {
    await new Promise((resolve,reject)=>{ const child=spawn(ffmpeg,args,{stdio:["ignore","ignore","pipe"]}); let stderr=""; child.stderr.on("data",c=>stderr=(stderr+c).slice(-8000)); const timer=setTimeout(()=>{child.kill("SIGKILL");reject(new RenderError(`render timed out after ${timeoutMs}ms`,504,"render_timeout"));},timeoutMs); child.on("error",e=>{clearTimeout(timer);reject(new RenderError(`cannot start ffmpeg: ${e.message}`));}); child.on("exit",code=>{clearTimeout(timer);if(code===0) resolve(); else reject(new RenderError(`ffmpeg exited ${code}: ${stderr.trim()}`));}); });
    await rename(temp,outputFile);
  } finally { await rm(temp,{force:true}); await rm(work,{recursive:true,force:true}); }
}
export async function readJson(file,fallback={}) { try{return JSON.parse(await readFile(file,"utf8"));}catch(e){if(e.code==="ENOENT")return fallback;throw e;} }
