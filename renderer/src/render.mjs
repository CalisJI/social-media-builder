import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { access, mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rendererRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const templatesRoot = path.resolve(process.env.RENDER_TEMPLATES_DIR || path.join(rendererRoot, "../templates"));
const partLabels = { adjective: "tính từ", adverb: "trạng từ", noun: "danh từ", verb: "động từ", preposition: "giới từ", pronoun: "đại từ" };

export class RenderError extends Error {
  constructor(message, status = 500, code = "render_failed") { super(message); this.status = status; this.code = code; }
}

function clean(value, name, max, { required = true, fallback = null } = {}) {
  if (value == null || (typeof value === "string" && !value.trim())) {
    if (!required) return fallback;
    throw new RenderError(`${name} is required`, 400, "invalid_payload");
  }
  if (typeof value !== "string") throw new RenderError(`${name} must be a string`, 400, "invalid_payload");
  const result = value.trim().replace(/\s+/g, " ");
  if (result.length > max) throw new RenderError(`${name} exceeds ${max} characters`, 400, "invalid_payload");
  return result;
}

function contained(root, candidate) { const rel = path.relative(root, candidate); return rel && !rel.startsWith("..") && !path.isAbsolute(rel); }

export async function loadTemplateRegistry(root = templatesRoot) {
  const registry = new Map();
  for (const item of await readdir(root, { withFileTypes: true })) {
    if (!item.isDirectory()) continue;
    const packageRoot = path.join(root, item.name); let manifest;
    try { manifest = JSON.parse(await readFile(path.join(packageRoot, "manifest.json"), "utf8")); } catch (error) { if (error.code === "ENOENT") continue; throw error; }
    if (!manifest.id || registry.has(manifest.id)) throw new RenderError(`invalid or duplicate template id: ${manifest.id || item.name}`);
    for (const key of ["background", "petal"]) {
      const resolved = path.resolve(packageRoot, manifest.assets?.[key] || "");
      if (!contained(root, resolved)) throw new RenderError(`template ${manifest.id} has unsafe ${key} path`);
      await access(resolved); manifest.assets[key] = resolved;
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

export async function normalizePayload(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new RenderError("JSON object required", 400, "invalid_payload");
  const entry = Array.isArray(input.entries) ? input.entries[0] : input.entry ?? input;
  if (!entry || (Array.isArray(input.entries) && input.entries.length !== 1)) throw new RenderError("exactly one vocabulary entry is required", 400, "invalid_payload");
  const template = await resolveTemplate(clean(input.template_id ?? "vocabulary-pastel-v1", "template_id", 60));
  const duration = Number(input.duration_seconds ?? 10);
  if (!Number.isFinite(duration) || duration < 9.8 || duration > 10.2) throw new RenderError("duration_seconds must be between 9.8 and 10.2", 400, "invalid_payload");
  const handle = clean(input.brand_handle ?? input.channel_handle, "brand_handle", 32);
  if (!/^@[A-Za-z0-9._]{1,31}$/.test(handle)) throw new RenderError("brand_handle must start with @ and contain only letters, numbers, dot or underscore", 400, "invalid_payload");
  const ipa = clean(entry.ipa, "ipa", 48, { required: false, fallback: "Phát âm đang cập nhật" });
  const part = clean(entry.part_of_speech, "part_of_speech", 24, { required: false, fallback: "từ vựng" });
  return {
    template: template.id, duration, word: clean(entry.word, "word", 24), ipa,
    part: partLabels[part.toLowerCase()] || part, meaning: clean(entry.meaning_vi, "meaning_vi", 90),
    exampleEn: clean(entry.example_en, "example_en", 90, { required: false, fallback: "Ví dụ đang cập nhật" }),
    exampleVi: clean(entry.example_vi, "example_vi", 100, { required: false, fallback: "" }),
    handle, cta: clean(entry.cta ?? input.cta, "cta", 54, { required: false, fallback: `Follow ${handle} • 1 từ mỗi ngày` }),
    pronunciationAudioUrl: entry.pronunciation_audio_url ?? null, backgroundMusicUrl: entry.background_music_url ?? null,
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

export async function renderVideo(payload, outputFile, { ffmpeg = process.env.FFMPEG_PATH || "ffmpeg", timeoutMs = Number(process.env.RENDER_TIMEOUT_MS || 120000) } = {}) {
  const template = await resolveTemplate(payload.template); const font = await fonts(); const work = `${outputFile}.work`;
  await rm(work, { recursive: true, force: true }); await mkdir(work, { recursive: true });
  const display = { hook: "TỪ NÀY NGHĨA LÀ GÌ?", word: payload.word.toUpperCase(), ipa: payload.ipa, part: payload.part, meaningLabel: "NGHĨA TIẾNG VIỆT", meaning: wrapText(payload.meaning, 31, 3), exampleLabel: "VÍ DỤ", en: wrapText(payload.exampleEn, 40, 2), vi: payload.exampleVi ? wrapText(payload.exampleVi, 44, 2) : "", cta: payload.cta };
  const files = {}; for (const [key, value] of Object.entries(display)) files[key] = await saveText(work, key, value);
  const p = template.palette; const dt = (file, weight, size, x, y, opts = "") => `drawtext=fontfile='${font[weight]}':textfile='${file}':fontcolor=${p.ink}:fontsize=${size}:x='${x}':y='${y}'${opts}`;
  const stages = [
    "[0:v]scale=1160:2062,crop=1080:1920:x='40+20*t/10':y='71+35*t/10',setsar=1[bg]",
    `[1:v]scale=96:96,format=rgba,rotate='-0.10+0.20*t/10':ow=rotw(iw):oh=roth(ih):c=none[petal]`,
    "[bg][petal]overlay=x=55:y='330+32*t/10'[decor]",
    `[decor]drawbox=x='96+18*max(0\,1-t/1.17)':y='300+23*max(0\,1-t/1.17)':w='888-36*max(0\,1-t/1.17)':h='1150-46*max(0\,1-t/1.17)':color=${p.card}@0.96:t=fill`,
    dt(files.hook,"bold",36,"(w-text_w)/2",`230+${rise(0,0.55,36)}`,`:alpha='${fade(0,0.55)}'`),
    dt(files.word,"extraBold",104,"(w-text_w)/2",`405+${rise(0.8,0.45,28)}`,`:alpha='${fade(0.8,0.45)}'`),
    `drawbox=x=160:y=540:w='min(680\,680*max(0\,min(1\,(t-1.15)/0.2)))':h=8:color=${p.accent}:t=fill:enable='gte(t,1.15)'`,
    `drawbox=x=210:y=565:w=620:h=64:color=${p.ipa}:t=fill:enable='gte(t,1.05)'`,
    dt(files.ipa,"regular",38,"(w-text_w)/2",575,`:alpha='${fade(1.05,0.4)}'`),
    dt(files.part,"bold",30,"(w-text_w)/2",646,`:fontcolor=${p.accent}:alpha='${fade(1.25,0.4)}'`),
    dt(files.meaningLabel,"bold",26,148,`748+${rise(2.2,0.5,26)}`,`:alpha='${fade(2.2,0.5)}'`),
    dt(files.meaning,"bold",44,148,`797+${rise(2.35,0.55,30)}`,`:line_spacing=8:alpha='${fade(2.35,0.55)}'`),
    dt(files.exampleLabel,"bold",26,148,`1005+${rise(4,0.5,24)}`,`:alpha='${fade(4,0.5)}'`),
    dt(files.en,"medium",36,148,`1054+${rise(4.15,0.55,28)}`,`:line_spacing=8:alpha='${fade(4.15,0.55)}'`),
    ...(payload.exampleVi ? [dt(files.vi,"medium",30,148,`1176+${rise(4.35,0.55,24)}`,`:fontcolor=${p.secondary}:line_spacing=7:alpha='${fade(4.35,0.55)}'`)] : []),
    `drawbox=x=160:y='1320+${rise(7.2,0.65,48)}':w=720:h=104:color=${p.card}:t=fill:enable='gte(t,7.2)'`,
    dt(files.cta,"bold",34,"(w-text_w)/2",`1350+${rise(7.2,0.65,48)}`,`:alpha='${fade(7.2,0.65)}'`),
    "format=yuv420p[out]"
  ];
  const filter = `${stages.slice(0, 3).join(";")};${stages.slice(3).join(",")}`;
  const temp = `${outputFile}.tmp.mp4`; await mkdir(path.dirname(outputFile), { recursive: true });
  const args = ["-hide_banner","-loglevel","error","-loop","1","-i",template.assets.background,"-loop","1","-i",template.assets.petal,"-filter_complex",filter,"-map","[out]","-t",String(payload.duration),"-an","-c:v","libx264","-profile:v","high","-preset",process.env.RENDER_PRESET||"medium","-crf",process.env.RENDER_CRF||"20","-pix_fmt","yuv420p","-movflags","+faststart","-r","30","-y",temp];
  try {
    await new Promise((resolve,reject)=>{ const child=spawn(ffmpeg,args,{stdio:["ignore","ignore","pipe"]}); let stderr=""; child.stderr.on("data",c=>stderr=(stderr+c).slice(-8000)); const timer=setTimeout(()=>{child.kill("SIGKILL");reject(new RenderError(`render timed out after ${timeoutMs}ms`,504,"render_timeout"));},timeoutMs); child.on("error",e=>{clearTimeout(timer);reject(new RenderError(`cannot start ffmpeg: ${e.message}`));}); child.on("exit",code=>{clearTimeout(timer);code===0?resolve():reject(new RenderError(`ffmpeg exited ${code}: ${stderr.trim()}`));}); });
    await rename(temp,outputFile);
  } finally { await rm(temp,{force:true}); await rm(work,{recursive:true,force:true}); }
}
export async function readJson(file,fallback={}) { try{return JSON.parse(await readFile(file,"utf8"));}catch(e){if(e.code==="ENOENT")return fallback;throw e;} }
