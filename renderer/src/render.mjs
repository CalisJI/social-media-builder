import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const limits = { word: 40, ipa: 80, part: 30, meaning: 120, example: 100, cta: 80 };

export class RenderError extends Error {
  constructor(message, status = 500, code = "render_failed") {
    super(message); this.status = status; this.code = code;
  }
}

function text(value, name, max, required = true) {
  if (value == null && !required) return "";
  if (typeof value !== "string" || !value.trim()) throw new RenderError(`${name} is required`, 400, "invalid_payload");
  const result = value.trim();
  if (result.length > max) throw new RenderError(`${name} exceeds ${max} characters`, 400, "invalid_payload");
  return result;
}

export function normalizePayload(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new RenderError("JSON object required", 400, "invalid_payload");
  const entry = Array.isArray(input.entries) ? input.entries[0] : input.entry ?? input;
  if (!entry || (Array.isArray(input.entries) && input.entries.length !== 1)) throw new RenderError("exactly one vocabulary entry is required", 400, "invalid_payload");
  const duration = Number(input.duration_seconds ?? 10);
  if (!Number.isFinite(duration) || duration < 8 || duration > 10.5) throw new RenderError("duration_seconds must be between 8 and 10.5", 400, "invalid_payload");
  const handle = text(input.brand_handle ?? input.channel_handle ?? "@english.daily.vn", "brand_handle", 40);
  return {
    template: text(input.template_id ?? "vocabulary-pastel-v1", "template_id", 60), duration,
    word: text(entry.word, "word", limits.word), ipa: text(entry.ipa, "ipa", limits.ipa),
    part: text(entry.part_of_speech, "part_of_speech", limits.part),
    meaning: text(entry.meaning_vi, "meaning_vi", limits.meaning),
    exampleEn: text(entry.example_en, "example_en", limits.example),
    exampleVi: text(entry.example_vi, "example_vi", limits.example),
    handle, cta: text(entry.cta ?? input.cta ?? `Follow ${handle} để học 1 từ mỗi ngày.`, "cta", limits.cta),
  };
}

export function payloadHash(payload) {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

const escapeFilterPath = (value) => value.replaceAll("\\", "/").replaceAll(":", "\\:").replaceAll("'", "'\\''");

async function saveText(dir, name, value) {
  const file = path.join(dir, `${name}.txt`); await writeFile(file, value, "utf8"); return escapeFilterPath(file);
}

export function wrapText(value, columns) {
  const words = value.split(/\s+/); const lines = []; let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length <= columns || !line) line = next;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines.join("\n");
}

export async function renderVideo(payload, outputFile, { ffmpeg = process.env.FFMPEG_PATH || "ffmpeg", timeoutMs = Number(process.env.RENDER_TIMEOUT_MS || 120000) } = {}) {
  const work = `${outputFile}.work`;
  await rm(work, { recursive: true, force: true }); await mkdir(work, { recursive: true });
  const files = {};
  const display = { word: payload.word.toUpperCase(), ipa: payload.ipa, part: payload.part, meaning: wrapText(payload.meaning, 34), en: wrapText(payload.exampleEn, 42), vi: wrapText(payload.exampleVi, 44), cta: wrapText(payload.cta, 44), handle: payload.handle };
  for (const [key, value] of Object.entries(display)) files[key] = await saveText(work, key, value);
  const font = escapeFilterPath(process.env.RENDER_FONT_FILE || "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf");
  const bold = escapeFilterPath(process.env.RENDER_BOLD_FONT_FILE || "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf");
  const dt = (file, size, y, extra = "") => `drawtext=fontfile='${extra.includes("bold") ? bold : font}':textfile='${file}':fontcolor=#17233c:fontsize=${size}:x=(w-text_w)/2:y=${y}${extra.replace("bold", "")}`;
  const filter = [
    "format=yuv420p",
    "drawbox=x=72:y=200:w=936:h=1370:color=#fff9ee@0.94:t=fill",
    "drawbox=x=72:y=200:w=16:h=1370:color=#ff6685:t=fill",
    dt(files.handle, 34, 252, ":fontcolor=#6d7890"),
    dt(files.word, 112, 390, "bold:enable='gte(t,0.15)'"),
    dt(files.ipa, 48, 535, ":fontcolor=#d74769:enable='gte(t,0.45)'"),
    dt(files.part, 38, 620, ":fontcolor=#6d7890:enable='gte(t,0.7)'"),
    dt(files.meaning, 44, 735, "bold:line_spacing=14:box=1:boxcolor=#ffd5df@0.7:boxborderw=20:enable='gte(t,1.1)'"),
    dt(files.en, 40, 985, ":line_spacing=12:fontcolor=#263a5c:enable='gte(t,2.0)'"),
    dt(files.vi, 35, 1090, ":line_spacing=10:fontcolor=#6d7890:enable='gte(t,2.2)'"),
    dt(files.cta, 34, 1340, "bold:line_spacing=10:fontcolor=white:box=1:boxcolor=#d74769:boxborderw=20:enable='gte(t,7.0)'"),
  ].join(",");
  const temp = `${outputFile}.tmp.mp4`;
  await mkdir(path.dirname(outputFile), { recursive: true });
  const args = ["-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i", `color=c=#cadfff:s=1080x1920:r=30:d=${payload.duration}`, "-vf", filter, "-an", "-c:v", "libx264", "-preset", process.env.RENDER_PRESET || "medium", "-crf", process.env.RENDER_CRF || "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-r", "30", "-y", temp];
  try {
    await new Promise((resolve, reject) => {
      const child = spawn(ffmpeg, args, { stdio: ["ignore", "ignore", "pipe"] }); let stderr = "";
      child.stderr.on("data", chunk => { stderr = (stderr + chunk).slice(-8000); });
      const timer = setTimeout(() => { child.kill("SIGKILL"); reject(new RenderError(`render timed out after ${timeoutMs}ms`, 504, "render_timeout")); }, timeoutMs);
      child.on("error", err => { clearTimeout(timer); reject(new RenderError(`cannot start ffmpeg: ${err.message}`)); });
      child.on("exit", code => { clearTimeout(timer); if (code === 0) resolve(); else reject(new RenderError(`ffmpeg exited ${code}: ${stderr.trim()}`)); });
    });
    await rename(temp, outputFile);
  } finally { await rm(temp, { force: true }); await rm(work, { recursive: true, force: true }); }
}

export async function readJson(file, fallback = {}) { try { return JSON.parse(await readFile(file, "utf8")); } catch (e) { if (e.code === "ENOENT") return fallback; throw e; } }
