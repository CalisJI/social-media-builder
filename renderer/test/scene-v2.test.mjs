import test from "node:test";
import assert from "node:assert/strict";
import { access, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { compileScenes } from "../src/compiler/compile-scenes.mjs";
import { resolveTemplateEngine } from "../src/template/resolve-template-engine.mjs";
import { sceneV2 } from "../src/engines/scene-v2.mjs";

const font = { regular: "/font.ttf", medium: "/font.ttf", bold: "/font.ttf", extraBold: "/font.ttf" };
const payload = { word: "resilient", meaning: "kiên cường", cta: "@daily" };
const saveText = async (name) => `/work/${name}.txt`;
const template = { id: "scene-test-v1", packageRoot: "/templates/scene-test-v1" };

test("scene-v2 compiles supported primitives and declared initial animations", async () => {
  const filter = await compileScenes({ template, payload, font, saveText, scene: [
    { type: "box", x: 0, y: 0, width: 1080, height: 1920, color: "#111111" },
    { type: "group", children: [{ type: "text", text: "{word}", x: 100, y: 200, fontSize: 52, weight: "bold", animations: [{ type: "fade-in", start: 0, duration: 0.3 }, { type: "slide-up", start: 0, duration: 0.3 }] }] },
    { type: "progress", x: 100, y: 400, width: 400, height: 8, value: 0.5, background: "#222222", color: "#FFFFFF" },
    { type: "image", asset: "assets/petal.png", x: 10, y: 20, width: 30, height: 40 },
  ] });
  assert.match(filter, /drawtext=.*scene-0\.txt/);
  assert.match(filter, /drawbox=/);
  assert.match(filter, /movie='\/templates\/scene-test-v1\/assets\/petal\.png'/);
  assert.match(filter, /format=yuv420p\[out\]/);
});

test("scene-v2 rejects unsafe image paths and unknown declarations", async () => {
  await assert.rejects(compileScenes({ template, payload, font, saveText, scene: [{ type: "image", asset: "../secret.png", x: 0, y: 0, width: 1, height: 1 }] }), /unsafe image asset path/);
  await assert.rejects(compileScenes({ template, payload, font, saveText, scene: [{ type: "script", source: "process.exit()" }] }), /unknown scene primitive/);
  await assert.rejects(compileScenes({ template, payload, font, saveText, scene: [{ type: "text", text: "x", x: 0, y: 0, fontSize: 1, animations: [{ type: "eval" }] }] }), /unknown animation/);
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
      template: { ...template, assets: { background }, scene: [{ type: "box", x: 0, y: 0, width: 1080, height: 1920, color: "#111111" }, { type: "text", text: "{word}", x: 100, y: 100, fontSize: 48 }] },
      outputFile: output, ffmpeg: "ffmpeg", timeoutMs: 120000, font: { regular: fontFile, medium: fontFile, bold: fontFile, extraBold: fontFile },
      saveText: async (work, name, value) => { const file = path.join(work, `${name}.txt`); await (await import("node:fs/promises")).writeFile(file, value); return file; },
      RenderError: Error,
    });
    await access(output);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
