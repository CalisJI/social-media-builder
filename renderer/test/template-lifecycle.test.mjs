import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import test from "node:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import net from "node:net";
import { createTemplateLifecycle, mandatoryPreviewFixtures } from "../src/template/lifecycle.mjs";

const constraints = Object.freeze({ brand_handle: { maxLength: 32 }, word: { maxLength: 24 }, ipa: { maxLength: 48 }, part_of_speech: { maxLength: 24 }, meaning_vi: { maxLength: 360 }, example_en: { maxLength: 240 }, example_vi: { maxLength: 240 }, cta: { maxLength: 54 } });
const template = { id: "lifecycle-test-v1", constraints, packageRoot: "/templates/lifecycle-test-v1" };
function lifecycle(outputDir, { failRender = false } = {}) { return createTemplateLifecycle({ outputDir, getRegistry: async () => new Map([[template.id, template]]), resolveTemplate: async id => { if (id !== template.id) throw new Error("missing template"); return template; }, normalizePayload: async input => ({ template: input.template_id, word: input.entries[0].word, duration: 10 }), renderVideo: async (_payload, output) => { if (failRender) throw new Error("overflow"); await writeFile(output, "preview"); }, probe: async file => { assert.equal((await readFile(file, "utf8")), "preview"); } }); }

test("imports remain inactive until a successful preview is explicitly activated", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "template-lifecycle-"));
  try { const service = lifecycle(dir); await service.markImported(template.id); assert.equal((await service.list())[0].status, "imported"); await assert.rejects(service.activate(template.id), error => error.code === "activation_blocked"); await service.validate(template.id); const preview = await service.preview(template.id); assert.deepEqual(preview.preview.fixtures, mandatoryPreviewFixtures(template.id, constraints).map(fixture => fixture.name)); await service.activate(template.id); assert.deepEqual(JSON.parse(await readFile(path.join(dir, "active-template.json"), "utf8")).id, template.id); assert.equal((await service.list())[0].status, "active"); } finally { await rm(dir, { recursive: true, force: true }); }
});
test("failed previews are persisted and cannot be activated", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "template-lifecycle-failed-"));
  try { const service = lifecycle(dir, { failRender: true }); await service.markImported(template.id); await service.validate(template.id); await assert.rejects(service.preview(template.id), error => error.code === "preview_failed"); await assert.rejects(service.activate(template.id), error => error.code === "activation_blocked"); assert.equal((await service.list())[0].status, "preview_failed"); } finally { await rm(dir, { recursive: true, force: true }); }
});

test("template lifecycle endpoints reject unauthenticated requests", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "template-lifecycle-http-"));
  const port = await new Promise((resolve, reject) => { const listener = net.createServer(); listener.once("error", reject); listener.listen(0, "127.0.0.1", () => { const value = listener.address().port; listener.close(error => error ? reject(error) : resolve(value)); }); });
  const server = spawn(process.execPath, ["src/server.mjs"], { cwd: path.resolve(import.meta.dirname, ".."), env: { ...process.env, RENDERER_PORT: String(port), RENDER_OUTPUT_DIR: dir, RENDER_TEMPLATE_ADMIN_TOKEN: "test-admin-token" } });
  try {
    await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error("renderer did not start")), 5000); server.stdout.on("data", value => { if (value.toString().includes("renderer listening")) { clearTimeout(timer); resolve(); } }); server.once("error", reject); server.once("exit", code => reject(new Error(`renderer exited early: ${code}`))); });
    const response = await fetch(`http://127.0.0.1:${port}/v1/templates`);
    assert.equal(response.status, 401); assert.equal((await response.json()).error, "unauthorized");
  } finally { server.kill(); await new Promise(resolve => server.exitCode !== null ? resolve() : server.once("exit", resolve)); await rm(dir, { recursive: true, force: true }); }
});
