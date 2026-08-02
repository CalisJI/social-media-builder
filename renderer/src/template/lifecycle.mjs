import { spawn } from "node:child_process";
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { RenderError } from "../render.mjs";

const lifecycleFile = outputDir => path.join(outputDir, "template-lifecycle.json");
const activeFile = outputDir => path.join(outputDir, "active-template.json");

async function readState(file) {
  try { return JSON.parse(await readFile(file, "utf8")); }
  catch (error) { if (error.code === "ENOENT") return {}; throw error; }
}

async function writeState(file, state) {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp`;
  await writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  await rename(temporary, file);
}

const clip = (value, maxLength) => value.slice(0, Math.max(1, maxLength));
const repeatTo = (value, maxLength) => clip(value.repeat(Math.ceil(maxLength / value.length)), maxLength);

export function mandatoryPreviewFixtures(templateId, constraints) {
  const max = field => constraints[field].maxLength;
  const base = {
    template_id: templateId, duration_seconds: 10, brand_handle: "@templateqa",
    entries: [{ word: "calm", ipa: "/kɑːm/", part_of_speech: "adjective", meaning_vi: "bình tĩnh", example_en: "Stay calm.", example_vi: "Hãy bình tĩnh." }],
  };
  const withEntry = (name, entry) => ({ name, ...base, entries: [{ ...base.entries[0], ...entry }] });
  return [
    withEntry("shortest-valid-word", { word: "a" }),
    withEntry("longest-supported-word", { word: repeatTo("character", max("word")) }),
    withEntry("short-meaning", { meaning_vi: "êm" }),
    withEntry("long-valid-meaning", { meaning_vi: clip("Khả năng giữ bình tĩnh và tiếp tục học hỏi trước những thay đổi bất ngờ. ", Math.min(max("meaning_vi"), 120)) }),
    withEntry("missing-optional-ipa-example", { ipa: null, example_en: null, example_vi: null }),
    withEntry("vietnamese-diacritics", { word: "yên", meaning_vi: "Sự bình yên giúp chúng ta lắng nghe và học tốt hơn.", example_vi: "Hãy giữ trái tim bình yên nhé." }),
    withEntry("near-overflow", { meaning_vi: clip("Một nội dung dài nhưng vẫn hợp lệ để kiểm tra khả năng co chữ, xuống dòng và giữ nguyên ý nghĩa giáo dục. ", Math.min(max("meaning_vi"), 110)), example_en: clip("A deliberately long but valid example checks that the preview layout remains readable.", Math.min(max("example_en"), 100)) }),
  ];
}

async function defaultProbe(file) {
  const output = await new Promise((resolve, reject) => {
    const child = spawn("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=codec_name,width,height,pix_fmt", "-of", "json", file]);
    let stdout = ""; let stderr = "";
    child.stdout.on("data", chunk => { stdout += chunk; }); child.stderr.on("data", chunk => { stderr += chunk; });
    child.on("error", reject); child.on("exit", code => code === 0 ? resolve(stdout) : reject(new Error(stderr || `ffprobe exited ${code}`)));
  });
  const stream = JSON.parse(output).streams?.[0];
  if (!stream || stream.codec_name !== "h264" || stream.width !== 1080 || stream.height !== 1920 || stream.pix_fmt !== "yuv420p") {
    throw new RenderError("preview output does not meet the video contract", 400, "preview_failed");
  }
}

export function createTemplateLifecycle({ outputDir, getRegistry, resolveTemplate, normalizePayload, renderVideo, probe = defaultProbe }) {
  const statePath = lifecycleFile(outputDir);
  const now = () => new Date().toISOString();
  async function record(id, patch) {
    const state = await readState(statePath); state[id] = { ...(state[id] || {}), ...patch }; await writeState(statePath, state); return state[id];
  }
  async function validate(id) {
    const template = await resolveTemplate(id);
    if (template.schema) {
      const schema = path.resolve(template.packageRoot, template.schema);
      if (!schema.startsWith(`${template.packageRoot}${path.sep}`)) throw new RenderError("template schema path is unsafe", 400, "invalid_template");
      JSON.parse(await readFile(schema, "utf8"));
    }
    return record(id, { status: "validated", validatedAt: now(), validation: { schema: true, assets: true, compatibility: true } });
  }
  async function preview(id) {
    const template = await resolveTemplate(id);
    const existing = (await readState(statePath))[id];
    if (!existing?.validatedAt) throw new RenderError("template must be validated before preview", 409, "not_validated");
    const directory = path.join(outputDir, "template-previews", `${id}-${Date.now()}`);
    const results = [];
    try {
      await mkdir(directory, { recursive: true });
      for (const fixture of mandatoryPreviewFixtures(id, template.constraints)) {
        const payload = await normalizePayload(fixture);
        const output = path.join(directory, `${fixture.name}.mp4`);
        await renderVideo({ ...payload, duration: 0.2 }, output);
        if ((await stat(output)).size < 1) throw new RenderError("preview output is empty", 400, "preview_failed");
        await probe(output); results.push(fixture.name);
      }
      return record(id, { status: "previewed", previewedAt: now(), preview: { status: "passed", fixtures: results } });
    } catch (error) {
      await record(id, { status: "preview_failed", previewedAt: now(), preview: { status: "failed", fixtures: results, error: error.message } });
      throw new RenderError(`template preview failed: ${error.message}`, 400, "preview_failed");
    } finally { await rm(directory, { recursive: true, force: true }); }
  }
  async function activate(id) {
    await resolveTemplate(id);
    const existing = (await readState(statePath))[id];
    if (!existing?.validatedAt || existing.preview?.status !== "passed") throw new RenderError("template must pass validation and preview before activation", 409, "activation_blocked");
    await mkdir(outputDir, { recursive: true }); await writeState(activeFile(outputDir), { id, activatedAt: now() });
    return record(id, { ...existing, status: "active", activatedAt: now() });
  }
  async function list() {
    const [registry, state, active] = await Promise.all([getRegistry(), readState(statePath), readState(activeFile(outputDir))]);
    return [...registry.values()].map(template => ({ id: template.id, status: active.id === template.id ? "active" : state[template.id]?.status || "available", lifecycle: state[template.id] || null }));
  }
  return { markImported: id => record(id, { status: "imported", importedAt: now() }), validate, preview, activate, list };
}
