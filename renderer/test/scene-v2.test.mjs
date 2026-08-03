import test from "node:test";
import assert from "node:assert/strict";
import { access, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { compileScenes } from "../src/compiler/compile-scenes.mjs";
import { componentRegistry } from "../src/compiler/component-registry.mjs";
import { resolveTemplateEngine } from "../src/template/resolve-template-engine.mjs";
import { sceneV2 } from "../src/engines/scene-v2.mjs";
import { normalizePayload, renderVideo } from "../src/render.mjs";
import { validatePresentationSchema } from "../src/template/validate-presentation-schema.mjs";
import { resolveDesignTokens } from "../src/template/resolve-design-tokens.mjs";

const exec = promisify(execFile);

const font = { regular: "/font.ttf", medium: "/font.ttf", bold: "/font.ttf", extraBold: "/font.ttf" };
const payload = { word: "resilient", meaning: "kiên cường", cta: "@daily" };
const saveText = async (name) => `/work/${name}.txt`;
const template = { id: "scene-test-v1", packageRoot: "/templates/scene-test-v1" };

test("scene-v2 compiles supported primitives and declared initial animations", async () => {
  const filter = await compileScenes({ template, payload, font, saveText, scene: [
    { type: "box", x: 0, y: 0, width: 1080, height: 1920, color: "#111111" },
    { type: "group", children: [{ type: "text", text: "{word}", x: 100, y: 200, fontSize: 52, weight: "bold", color: "#FFFFFF", animations: [{ type: "fade-in", start: 0, duration: 0.3 }, { type: "slide-up", start: 0, duration: 0.3 }] }] },
    { type: "progress", x: 100, y: 400, width: 400, height: 8, value: 0.5, background: "#222222", color: "#FFFFFF" },
    { type: "image", asset: "assets/petal.png", x: 10, y: 20, width: 30, height: 40 },
  ] });
  assert.match(filter, /drawtext=.*scene-0\.txt/);
  assert.match(filter, /drawbox=/);
  assert.match(filter, /movie='\/templates\/scene-test-v1\/assets\/petal\.png'/);
  assert.match(filter, /format=yuv420p\[out\]/);
});

test("scene-v2 text wraps and shrinks within declared bounds", async () => {
  let savedText;
  const filter = await compileScenes({ template, payload: { ...payload, meaning: "nội dung học tập dài cần được xuống dòng để vừa khung" }, font, saveText: async (_, value) => { savedText = value; return "/work/text.txt"; }, scene: [
    { type: "text", text: "{meaning}", x: 0, y: 0, fontSize: 40, minFontSize: 20, maxWidth: 160, maxHeight: 120, lineSpacing: 4, color: "#FFFFFF" },
  ] });
  assert.match(savedText, /\n/);
  assert.doesNotMatch(filter, /fontsize='40\*/);
});

test("scene-v2 honors a template-declared truncate policy", async () => {
  let savedText;
  await compileScenes({ template, payload: { ...payload, meaning: "một hai ba bốn" }, font, saveText: async (_, value) => { savedText = value; return "/work/text.txt"; }, scene: [
    { type: "text", text: "{meaning}", x: 0, y: 0, fontSize: 20, maxWidth: 100, maxHeight: 20, maxLines: 1, overflowPolicy: "truncate", color: "#FFFFFF" },
  ] });
  assert.equal(savedText, "một hai…");
});

test("scene-v2 snapshots canonical animation filters for every primitive", async () => {
  const filter = await compileScenes({ template, payload, font, saveText, scene: [
    { type: "text", text: "{word}", x: 100, y: 200, fontSize: 52, color: "#FFFFFF", animations: [{ type: "none" }, { type: "fade", start: 0, duration: 0.5 }, { type: "scale", start: 0, duration: 0.5 }] },
    { type: "box", x: 0, y: 0, width: 100, height: 100, color: "#111111", animations: [{ type: "rise", start: 0, duration: 0.5 }] },
    { type: "image", asset: "assets/petal.png", x: 10, y: 20, width: 30, height: 40, animations: [{ type: "slide-left", start: 0, duration: 0.5 }] },
    { type: "progress", x: 0, y: 0, width: 100, height: 10, value: 0.5, background: "#222222", color: "#FFFFFF", animations: [{ type: "slide-right", start: 0, duration: 0.5 }] },
  ] });
  assert.equal(filter, await readFile(path.resolve(import.meta.dirname, "snapshots/scene-v2-canonical-filter.txt"), "utf8"));
});

test("scene-v2 rejects unsafe image paths and unknown declarations", async () => {
  await assert.rejects(compileScenes({ template, payload, font, saveText, scene: [{ type: "image", asset: "../secret.png", x: 0, y: 0, width: 1, height: 1 }] }), /unsafe image asset path/);
  await assert.rejects(compileScenes({ template, payload, font, saveText, scene: [{ type: "script", source: "process.exit()" }] }), /unknown scene primitive/);
  await assert.rejects(compileScenes({ template, payload, font, saveText, scene: [{ type: "text", text: "x", x: 0, y: 0, fontSize: 1, animations: [{ type: "eval" }] }] }), /unknown animation/);
});

test("component registry uses stable declarative component IDs", () => {
  assert.deepEqual([...componentRegistry.keys()], ["text", "box", "image", "progress", "group"]);
  for (const component of componentRegistry.values()) {
    assert.equal(component.id, component.type);
    assert.ok(component.input.layout);
    assert.ok(component.input.style);
    assert.equal(component.input.timeline, "animations");
    assert.equal(typeof component.validate, "function");
    assert.equal(typeof component.compile, "function");
  }
  assert.throws(() => validatePresentationSchema({ engine: "scene-v2", templateSchemaVersion: 2, capabilities: [], scene: [{ type: "script" }] }, "/templates/test"), error => error.code === "invalid_template");
});

test("presentation schema versions scene templates and rejects invalid declarations", () => {
  const scene = [{ id: "title", type: "text", text: "x", x: 0, y: 0, fontSize: 1 }];
  assert.equal(validatePresentationSchema({ engine: "scene-v2", templateSchemaVersion: 2, capabilities: [], scene }, "/templates/test"), 2);
  assert.equal(validatePresentationSchema({}, "/templates/test"), 1);
  assert.throws(() => validatePresentationSchema({ engine: "scene-v2", capabilities: [], scene }, "/templates/test"), /require templateSchemaVersion/);
  assert.throws(() => validatePresentationSchema({ engine: "scene-v2", templateSchemaVersion: 2, capabilities: [], scene: [...scene, { ...scene[0] }] }, "/templates/test"), /duplicate.*component id/);
  assert.throws(() => validatePresentationSchema({ engine: "scene-v2", templateSchemaVersion: 2, capabilities: [], scene: [{ type: "script" }] }, "/templates/test"), /unknown scene primitive/);
  assert.throws(() => validatePresentationSchema({ engine: "scene-v2", templateSchemaVersion: 2, capabilities: ["admin"], scene }, "/templates/test"), /supported capabilities/);
  assert.throws(() => validatePresentationSchema({ engine: "scene-v2", templateSchemaVersion: 2, capabilities: [], scene: [{ type: "image", asset: "../secret.png" }] }, "/templates/test"), /unsafe image asset path/);
});

test("design tokens resolve named presentation values and reject missing references", () => {
  const template = {
    engine: "scene-v2",
    tokens: {
      colors: { ink: "#27243A" },
      typography: { body: { fontSize: 36, weight: "bold" } },
      spacing: { "6": 24 }, radius: { card: 32 }, shadows: { card: "none" }, motion: { enter: { duration: 0.5 } },
    },
    scene: [{ type: "text", text: "x", x: "$spacing.6", y: 0, fontSize: "$typography.body.fontSize", weight: "$typography.body.weight", color: "$colors.ink", animations: [{ type: "fade-in", start: 0, duration: "$motion.enter.duration" }] }],
  };
  const resolved = resolveDesignTokens(template);
  assert.equal(resolved.scene[0].color, "#27243A");
  assert.equal(resolved.scene[0].fontSize, 36);
  assert.throws(() => resolveDesignTokens({ ...template, scene: [{ ...template.scene[0], color: "$colors.missing" }] }), /unknown design token/);
});

test("scene-v2 is registered without changing the legacy default", () => {
  assert.equal(resolveTemplateEngine({}).id, "legacy-v1");
  assert.equal(resolveTemplateEngine({ engine: "scene-v2" }).id, "scene-v2");
});

test("scene-v2 renders a declarative scene", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "scene-v2-render-"));
  const background = path.resolve(import.meta.dirname, "../../templates/vocabulary-pastel-v1/assets/background.png");
  const fontFile = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";
  try {
    await access(fontFile);
    const output = path.join(dir, "scene.mp4");
    await sceneV2.render({
      payload: { ...payload, duration: 0.2, backgroundMusicUrl: null },
      template: { ...template, assets: { background }, scene: [{ type: "box", x: 0, y: 0, width: 1080, height: 1920, color: "#111111" }, { type: "text", text: "{word}", x: 100, y: 100, fontSize: 48, color: "#FFFFFF" }] },
      outputFile: output, ffmpeg: "ffmpeg", timeoutMs: 120000, font: { regular: fontFile, medium: fontFile, bold: fontFile, extraBold: fontFile },
      saveText: async (work, name, value) => { const file = path.join(work, `${name}.txt`); await (await import("node:fs/promises")).writeFile(file, value); return file; },
      RenderError: Error,
    });
    await access(output);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("pastel scene-v2 preview fixtures render and retain the TikTok video contract", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "pastel-scene-v2-fixtures-"));
  const fixtureDir = path.resolve(import.meta.dirname, "../../templates/vocabulary-pastel-scene-v2/fixtures");
  const fontFile = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";
  const previousFonts = Object.fromEntries(["REGULAR", "MEDIUM", "BOLD", "EXTRABOLD"].map(weight => [`RENDER_FONT_${weight}`, process.env[`RENDER_FONT_${weight}`]]));
  try {
    await access(fontFile);
    for (const key of Object.keys(previousFonts)) process.env[key] = fontFile;
    const fixtures = (await readdir(fixtureDir)).filter(name => name.endsWith(".json")).sort();
    assert.deepEqual(fixtures, ["01-short-word.json", "02-long-word.json", "03-short-meaning.json", "04-long-valid-meaning.json", "05-missing-ipa.json", "06-vietnamese-diacritics.json"]);
    for (const fixture of fixtures) {
      const normalized = await normalizePayload(JSON.parse(await readFile(path.join(fixtureDir, fixture), "utf8")));
      const output = path.join(dir, `${fixture}.mp4`);
      await renderVideo({ ...normalized, duration: 0.2 }, output, { timeoutMs: 120000 });
      const { stdout } = await exec("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=codec_name,width,height,pix_fmt,r_frame_rate", "-of", "json", output]);
      const video = JSON.parse(stdout).streams[0];
      assert.deepEqual({ codec: video.codec_name, width: video.width, height: video.height, pixFmt: video.pix_fmt, fps: video.r_frame_rate }, { codec: "h264", width: 1080, height: 1920, pixFmt: "yuv420p", fps: "30/1" }, fixture);
    }
  } finally {
    for (const [key, value] of Object.entries(previousFonts)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    await rm(dir, { recursive: true, force: true });
  }
});

test("quiz-reveal fixture declares its guess window and renders", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "quiz-reveal-fixture-"));
  const fixture = path.resolve(import.meta.dirname, "../../templates/vocabulary-quiz-v1/fixtures/01-valid-quiz.json");
  const strategyFile = path.resolve(import.meta.dirname, "../../strategies/quiz-reveal-v1.json");
  const fontFile = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";
  const previousFonts = Object.fromEntries(["REGULAR", "MEDIUM", "BOLD", "EXTRABOLD"].map(weight => [`RENDER_FONT_${weight}`, process.env[`RENDER_FONT_${weight}`]]));
  try {
    await access(fontFile);
    for (const key of Object.keys(previousFonts)) process.env[key] = fontFile;
    const strategy = JSON.parse(await readFile(strategyFile, "utf8"));
    assert.deepEqual(strategy.stages.filter(({ id }) => id === "guess" || id === "reveal"), [
      { id: "guess", role: "word", start: 0.6, duration: 3.4 },
      { id: "reveal", role: "meaning_vi", start: 4, duration: 0.5 },
    ]);
    const payload = await normalizePayload(JSON.parse(await readFile(fixture, "utf8")));
    await renderVideo({ ...payload, duration: 0.2 }, path.join(dir, "quiz.mp4"), { timeoutMs: 120000 });
    await access(path.join(dir, "quiz.mp4"));
  } finally {
    for (const [key, value] of Object.entries(previousFonts)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    await rm(dir, { recursive: true, force: true });
  }
});
