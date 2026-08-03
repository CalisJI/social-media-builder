import test from "node:test";
import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { normalizePayload, payloadHash, prepareTextLayout, RenderError, renderVideo, resolveTemplate, validateStrategy, wrapText } from "../src/render.mjs";
import { resolveAdaptiveText } from "../src/layout/adaptive-text.mjs";
import { buildRenderManifestRecord, renderResponseMetadata } from "../src/model/render-record.mjs";
import { ConstraintError, resolveConstraints } from "../src/validation/resolve-constraints.mjs";
import { resolveTemplateEngine } from "../src/template/resolve-template-engine.mjs";
import { validateTemplateStrategyCompatibility } from "../src/template/validate-capabilities.mjs";
const exec = promisify(execFile);
const sample={template_id:"vocabulary-pastel-v1",duration_seconds:10,brand_handle:"@daily",entries:[{word:"resilient",ipa:"/test/",part_of_speech:"adjective",meaning_vi:"kiên cường",example_en:"Stay resilient.",example_vi:"Hãy kiên cường."}]};
test("normalizes CAL-30 payload and derives CTA",async()=>{const p=await normalizePayload(sample);assert.equal(p.duration,10);assert.match(p.cta,/@daily/);assert.equal(payloadHash(p),payloadHash(await normalizePayload(sample)));});
test("normalizes nested content and presentation payloads like legacy payloads",async()=>{
  const { entries, template_id, duration_seconds, ...request } = sample;
  const v2 = { ...request, content: entries[0], presentation: { template_id, duration_seconds } };
  assert.deepEqual(await normalizePayload(v2), await normalizePayload(sample));
});
test("records a strategy-authorized presentation split in render metadata",async()=>{
  const payload = await normalizePayload({ ...sample, presentation: { split_scene: { stage_id: "meaning", parts: ["kiên", "cường"] } } });
  assert.deepEqual(renderResponseMetadata(payload).split_scene,{stage_id:"meaning",scene_count:2,duration:8.35});
  assert.deepEqual(renderResponseMetadata(payload).warnings,[{code:"split_scene",stageId:"meaning",sceneCount:2}]);
});
test("defaults legacy requests to the classic definition strategy",async()=>{
  assert.equal((await normalizePayload(sample)).strategy,"classic-definition-v1");
});
test("resolves an explicit known strategy",async()=>{
  const payload = await normalizePayload({ ...sample, presentation: { strategy_id: "classic-definition-v1" } });
  assert.equal(payload.strategy,"classic-definition-v1");
});
test("normalizes mistake-correction content declared by its compatible scene template",async()=>{
  const request = JSON.parse(await readFile(path.resolve(import.meta.dirname, "../../templates/vocabulary-mistake-correction-scene-v2/fixtures/01-valid-mistake.json"), "utf8"));
  const payload = await normalizePayload(request);
  assert.equal(payload.strategy, "mistake-correction-v1");
  assert.equal(payload.common_mistake, request.entries[0].common_mistake);
});
test("normalizes vocabulary quiz content declared by its compatible template",async()=>{
  const request = JSON.parse(await readFile(path.resolve(import.meta.dirname, "../../templates/vocabulary-quiz-v1/fixtures/01-valid-quiz.json"), "utf8"));
  const payload = await normalizePayload(request);
  assert.equal(payload.strategy, "quiz-reveal-v1");
  assert.equal(payload.template, "vocabulary-quiz-v1");
});
test("reports the missing common_mistake required by mistake correction",async()=>{
  await assert.rejects(
    normalizePayload({ ...sample, template_id: "vocabulary-mistake-correction-scene-v2", strategy_id: "mistake-correction-v1" }),
    error => error.status === 400 && error.code === "invalid_payload" && /mistake-correction-v1 requires common_mistake/.test(error.message),
  );
});
test("rejects mistake-correction content that exceeds its template constraint",async()=>{
  await assert.rejects(
    normalizePayload({ ...sample, template_id: "vocabulary-mistake-correction-scene-v2", strategy_id: "mistake-correction-v1", entries: [{ ...sample.entries[0], common_mistake: "x".repeat(361) }] }),
    /common_mistake.*constraints\.maxLength.*360/,
  );
});
test("accepts a strategy declared compatible by a template",()=>{
  assert.doesNotThrow(() => validateTemplateStrategyCompatibility(
    { id: "quiz-template-v1", capabilities: ["quizReveal"], compatibleStrategies: ["quiz-v1"] },
    { id: "quiz-v1", capabilitiesRequired: ["quizReveal"] },
  ));
});
test("rejects an incompatible template and strategy before rendering",()=>{
  assert.throws(() => validateTemplateStrategyCompatibility(
    { id: "definition-template-v1", capabilities: [], compatibleStrategies: [] },
    { id: "classic-definition-v1", capabilitiesRequired: [] },
  ), error => error.status === 400 && error.code === "incompatible_strategy");
});
test("falls back to classic compatibility for legacy manifests",()=>{
  assert.doesNotThrow(() => validateTemplateStrategyCompatibility(
    { id: "legacy-template-v1" },
    { id: "classic-definition-v1", capabilitiesRequired: [] },
  ));
});
test("normalizes experiment and variant identifiers from presentation metadata",async()=>{
  const payload = await normalizePayload({ ...sample, presentation: {
    template_id: "vocabulary-dark-reference-v1", strategy_id: "classic-definition-v1",
    experiment_id: "hook-test-2026", variant_id: "dark-control"
  }});
  assert.deepEqual(renderResponseMetadata(payload), {
    template_id: "vocabulary-dark-reference-v1", strategy_id: "classic-definition-v1",
    experiment_id: "hook-test-2026", variant_id: "dark-control"
  });
});
test("legacy jobs receive null experiment metadata and variants affect the payload hash",async()=>{
  const legacy = await normalizePayload(sample);
  assert.deepEqual(renderResponseMetadata(legacy), {
    template_id: "vocabulary-pastel-v1", strategy_id: "classic-definition-v1",
    experiment_id: null, variant_id: null
  });
  const control = await normalizePayload({ ...sample, presentation: { variant_id: "control" } });
  const treatment = await normalizePayload({ ...sample, presentation: { variant_id: "treatment" } });
  assert.notEqual(payloadHash(control), payloadHash(treatment));
});
test("manifest records retain payload and artifact hashes with render metadata",async()=>{
  const payload = await normalizePayload({ ...sample, presentation: { experiment_id: "copy-test", variant_id: "a" } });
  assert.deepEqual(buildRenderManifestRecord({ payload, payloadSha256: "payload-hash", artifactSha256: "artifact-hash", filename: "render.mp4", completedAt: "2026-08-02T00:00:00.000Z" }), {
    hash: "payload-hash", payloadSha256: "payload-hash", artifactSha256: "artifact-hash", filename: "render.mp4", completedAt: "2026-08-02T00:00:00.000Z",
    metadata: { template_id: "vocabulary-pastel-v1", strategy_id: "classic-definition-v1", experiment_id: "copy-test", variant_id: "a" }
  });
});
test("cached render response preserves persisted metadata and hashes",async()=>{
  const dir = await mkdtemp(path.join(os.tmpdir(), "renderer-cache-metadata-"));
  const port = await new Promise((resolve, reject) => {
    const listener = net.createServer(); listener.once("error", reject); listener.listen(0, "127.0.0.1", () => {
      const value = listener.address().port; listener.close(error => error ? reject(error) : resolve(value));
    });
  });
  const key = "metadata-cache-key";
  const payload = await normalizePayload({ ...sample, presentation: { experiment_id: "cta-test", variant_id: "b" } });
  const hash = payloadHash(payload);
  await writeFile(path.join(dir, `${key}.mp4`), "cached artifact");
  await writeFile(path.join(dir, "manifest.json"), JSON.stringify({ [key]: buildRenderManifestRecord({ payload, payloadSha256: hash, artifactSha256: "artifact-hash", filename: `${key}.mp4`, completedAt: "2026-08-02T00:00:00.000Z" }) }));
  const server = spawn(process.execPath, ["src/server.mjs"], { cwd: path.resolve(import.meta.dirname, ".."), env: { ...process.env, RENDERER_PORT: String(port), RENDER_OUTPUT_DIR: dir } });
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("renderer did not start")), 5000);
      server.stdout.on("data", data => { if (data.toString().includes("renderer listening")) { clearTimeout(timer); resolve(); } });
      server.once("error", error => { clearTimeout(timer); reject(error); });
      server.once("exit", code => { clearTimeout(timer); reject(new Error(`renderer exited early: ${code}`)); });
    });
    const response = await fetch(`http://127.0.0.1:${port}/v1/renders`, { method: "POST", headers: { "content-type": "application/json", "idempotency-key": key }, body: JSON.stringify({ ...sample, presentation: { experiment_id: "cta-test", variant_id: "b" } }) });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      status: "completed", cached: true, idempotencyKey: key, sha256: hash, payloadSha256: hash, artifactSha256: "artifact-hash",
      metadata: { template_id: "vocabulary-pastel-v1", strategy_id: "classic-definition-v1", experiment_id: "cta-test", variant_id: "b" }, url: `http://localhost:${port}/files/${key}.mp4`
    });
    const conflict = await fetch(`http://127.0.0.1:${port}/v1/renders`, { method: "POST", headers: { "content-type": "application/json", "idempotency-key": key }, body: JSON.stringify({ ...sample, presentation: { experiment_id: "cta-test", variant_id: "c" } }) });
    assert.equal(conflict.status, 409);
    assert.equal((await conflict.json()).error, "idempotency_conflict");
  } finally {
    server.kill(); await new Promise(resolve => server.exitCode !== null ? resolve() : server.once("exit", resolve));
    await rm(dir, { recursive: true, force: true });
  }
});
test("does not complete the manifest when artifact QA fails", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "renderer-artifact-qa-"));
  const port = await new Promise((resolve, reject) => {
    const listener = net.createServer(); listener.once("error", reject); listener.listen(0, "127.0.0.1", () => {
      const value = listener.address().port; listener.close(error => error ? reject(error) : resolve(value));
    });
  });
  const fakeFfmpeg = path.join(dir, "ffmpeg.mjs");
  await writeFile(fakeFfmpeg, `#!/usr/bin/env node\nimport { writeFile } from "node:fs/promises"; await writeFile(process.argv.at(-1), "");`);
  await chmod(fakeFfmpeg, 0o755);
  const font = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";
  const server = spawn(process.execPath, ["src/server.mjs"], { cwd: path.resolve(import.meta.dirname, ".."), env: { ...process.env, RENDERER_PORT: String(port), RENDER_OUTPUT_DIR: dir, FFMPEG_PATH: fakeFfmpeg, RENDER_FONT_REGULAR: font, RENDER_FONT_MEDIUM: font, RENDER_FONT_BOLD: font, RENDER_FONT_EXTRABOLD: font } });
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("renderer did not start")), 5000);
      server.stdout.on("data", data => { if (data.toString().includes("renderer listening")) { clearTimeout(timer); resolve(); } });
      server.once("error", error => { clearTimeout(timer); reject(error); });
      server.once("exit", code => { clearTimeout(timer); reject(new Error(`renderer exited early: ${code}`)); });
    });
    const response = await fetch(`http://127.0.0.1:${port}/v1/renders`, { method: "POST", headers: { "content-type": "application/json", "idempotency-key": "artifact-qa-failure" }, body: JSON.stringify(sample) });
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { error: "artifact_qa_failed", message: "render failed", details: { field: "size", expected: "> 0", actual: 0 } });
    await assert.rejects(readFile(path.join(dir, "manifest.json")));
  } finally {
    server.kill(); await new Promise(resolve => server.exitCode !== null ? resolve() : server.once("exit", resolve));
    await rm(dir, { recursive: true, force: true });
  }
});
test("rejects an unknown strategy",async()=>{
  await assert.rejects(normalizePayload({ ...sample, strategy_id: "missing-v1" }), error => error.status === 400 && error.code === "unknown_strategy");
});
test("validates strategy-required content",async()=>{
  const request = { ...sample, entries: [{ ...sample.entries[0], word: "" }] };
  await assert.rejects(normalizePayload(request), /strategy classic-definition-v1 requires word/);
});
test("validates strategy capability requirements",()=>{
  assert.throws(() => validateStrategy({ id: "quiz-v1", requires: [], capabilitiesRequired: ["quizReveal"] }, { capabilities: [] }), /requires capability quizReveal/);
});
test("applies nullable fallbacks",async()=>{const p=await normalizePayload({...sample,entries:[{...sample.entries[0],ipa:null,part_of_speech:null,example_en:null,example_vi:null}]});assert.equal(p.ipa,"Phát âm đang cập nhật");assert.equal(p.part,"từ vựng");assert.equal(p.exampleVi,"");});
test("rejects batches",async()=>assert.rejects(normalizePayload({...sample,entries:[...sample.entries,...sample.entries]}),RenderError));
test("rejects out-of-range duration",async()=>assert.rejects(normalizePayload({...sample,duration_seconds:30}),/duration_seconds/));
test("uses manifest constraints instead of shared content limits",async()=>{
  const constrained = { ...sample, template_id: "vocabulary-pastel-test-v1", entries: [{ ...sample.entries[0], word: "short", meaning_vi: "ngắn gọn" }] };
  assert.equal((await normalizePayload(constrained)).word, "short");
  await assert.rejects(normalizePayload({ ...constrained, entries: [{ ...constrained.entries[0], word: "toolong" }] }), /word.*constraints\.maxLength.*5/);
});
test("accepts long valid meaning beyond the retired global 90-character limit",async()=>{
  const meaning = "Khả năng phục hồi và thích nghi trước khó khăn ".repeat(3).trim();
  const payload = await normalizePayload({ ...sample, entries: [{ ...sample.entries[0], meaning_vi: meaning }] });
  assert.equal(payload.meaning, meaning);
  assert.ok(payload.meaning.length > 90);
});
test("rejects malformed manifest constraints with the field and constraint",()=>{
  assert.throws(() => resolveConstraints({ meaning_vi: { maxLength: 0 } }), error => error instanceof ConstraintError && /meaning_vi.*constraints\.maxLength/.test(error.message));
});
test("registry swaps between two fixture packages",async()=>{assert.equal((await resolveTemplate("vocabulary-pastel-v1")).palette.accent,"#E85D75");assert.equal((await resolveTemplate("vocabulary-pastel-test-v1")).palette.accent,"#6E67D8");});
test("template engine defaults old manifests to legacy-v1",()=>assert.equal(resolveTemplateEngine({}).id,"legacy-v1"));
test("template engine rejects unknown engines structurally",()=>assert.throws(()=>resolveTemplateEngine({engine:"unknown-v1"}),error=>error.status===400&&error.code==="invalid_template"));
test("registry applies theme.json overrides",async()=>{const template=await resolveTemplate("vocabulary-pastel-test-v1");assert.equal(template.copy.hook,"THEME OVERRIDE");assert.equal(template.copy.meaningLabel,"MEANING");assert.equal(template.timeline.hook[0],0.1);});
test("registers the dark reference layout",async()=>{const template=await resolveTemplate("vocabulary-dark-reference-v1");assert.equal(template.layout.variant,"dark-slide");assert.equal(template.palette.accent,"#FF595E");});
test("rejects unknown template IDs",async()=>assert.rejects(resolveTemplate("missing-v1"),error=>error.status===400&&error.code==="unknown_template"));
test("wraps long content and enforces line bounds",()=>{assert.equal(wrapText("one two three four",7),"one two\nthree\nfour");assert.throws(()=>wrapText("one two three",3,2),/2 lines/);});
test("lays out Vietnamese diacritics without losing characters",async()=>{
  const payload = await normalizePayload({ ...sample, entries: [{ ...sample.entries[0], meaning_vi: "Sự kiên cường giúp chúng ta vượt qua những thử thách bất ngờ." }] });
  const layout = prepareTextLayout(payload, await resolveTemplate(payload.template));
  assert.equal(layout.meaning.text.replaceAll("\n", " "), payload.meaning);
});
test("shrinks long meaning and example but never below their declared minimum",async()=>{
  const payload = await normalizePayload({ ...sample, entries: [{ ...sample.entries[0], meaning_vi: "Khả năng duy trì sự bình tĩnh và tiếp tục tiến về phía trước khi gặp hoàn cảnh khó khăn.", example_en: "She stayed resilient when unexpected obstacles made the project harder." }] });
  const layout = prepareTextLayout(payload, await resolveTemplate(payload.template));
  assert.ok(layout.meaning.fontSize >= 30); assert.ok(layout.en.fontSize >= 26);
  assert.equal(layout.meaning.text.replaceAll("\n", " "), payload.meaning);
  assert.equal(layout.en.text.replaceAll("\n", " "), payload.exampleEn);
});
test("returns structured text_overflow when no policy can fit all educational content",()=>{
  assert.throws(() => resolveAdaptiveText({ value: "nội dung học tập không được cắt bỏ", field: "meaning", policy: { maxWidth: 40, maxLines: 1, fontSize: 20, minFontSize: 20 } }), error => error.code === "text_overflow" && error.details.field === "meaning");
});
test("tries declared alternate layouts before reporting overflow",()=>{
  const layout = resolveAdaptiveText({ value: "một hai ba bốn", field: "meaning", policy: { maxWidth: 20, maxLines: 1, fontSize: 20, minFontSize: 20, alternate: { maxWidth: 200, maxLines: 1, fontSize: 20, minFontSize: 20 } } });
  assert.equal(layout.policy, "alternate");
  assert.equal(layout.text, "một hai ba bốn");
});
test("uses the primary layout before declared fallbacks",()=>{
  const layout = resolveAdaptiveText({ value: "một hai", field: "meaning", policy: { maxWidth: 50, maxLines: 1, fontSize: 20, minFontSize: 10, alternate: { maxWidth: 200, maxLines: 1, fontSize: 20, minFontSize: 20 } } });
  assert.equal(layout.policy, "shrink");
  assert.ok(layout.fontSize < 20);
});
test("uses only each template-declared overflow policy",()=>{
  const base = { value: "một hai ba bốn", field: "meaning", policy: { maxWidth: 100, maxLines: 1, fontSize: 20, minFontSize: 10 } };
  assert.throws(() => resolveAdaptiveText({ ...base, policy: { ...base.policy, mode: "error" } }), error => error.details.field === "meaning" && error.details.failedPolicy === "error" && !!error.details.measured);
  assert.equal(resolveAdaptiveText({ ...base, policy: { ...base.policy, mode: "shrink" } }).policy, "shrink");
  assert.equal(resolveAdaptiveText({ ...base, policy: { ...base.policy, mode: "alternate-layout", alternates: [{ ...base.policy, maxWidth: 200, mode: "wrap" }] } }).policy, "alternate-layout");
  assert.deepEqual(resolveAdaptiveText({ ...base, policy: { ...base.policy, mode: "split-scene", splitScene: { maxLines: 1, maxScenes: 4 } } }).scenes, ["một hai", "ba bốn"]);
  assert.equal(resolveAdaptiveText({ ...base, policy: { ...base.policy, mode: "truncate" } }).text, "một hai…");
});

test("honors template_key from workflow payloads",async()=>{
  const payload=await normalizePayload({...sample,template_id:undefined,template_key:"vocabulary-dark-reference-v1"});
  assert.equal(payload.template,"vocabulary-dark-reference-v1");
});

test("uses the last imported template when the workflow omits a template id",async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),"renderer-active-template-"));
  const previous=process.env.RENDER_OUTPUT_DIR;
  try {
    process.env.RENDER_OUTPUT_DIR=dir;
    await writeFile(path.join(dir,"active-template.json"),JSON.stringify({id:"vocabulary-dark-reference-v1"}));
    const withoutTemplate = { ...sample }; delete withoutTemplate.template_id;
    assert.equal((await normalizePayload(withoutTemplate)).template,"vocabulary-dark-reference-v1");
  } finally {
    if (previous === undefined) delete process.env.RENDER_OUTPUT_DIR; else process.env.RENDER_OUTPUT_DIR=previous;
    await rm(dir,{recursive:true,force:true});
  }
});

test("renders an audio stream when background music is selected",async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),"renderer-audio-"));
  const audio=path.join(dir,"music.m4a"), output=path.join(dir,"output.mp4");
  try {
    await exec("ffmpeg",["-hide_banner","-loglevel","error","-f","lavfi","-i","sine=frequency=440:sample_rate=44100","-t","1","-c:a","aac","-y",audio]);
    const font="/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";
    process.env.RENDER_FONT_REGULAR=font; process.env.RENDER_FONT_MEDIUM=font; process.env.RENDER_FONT_BOLD=font; process.env.RENDER_FONT_EXTRABOLD=font;
    const payload=await normalizePayload({...sample,background_music_url:audio});
    await renderVideo(payload,output,{timeoutMs:120000});
    const {stdout}=await exec("ffprobe",["-v","error","-select_streams","a","-show_entries","stream=codec_type","-of","csv=p=0",output]);
    assert.equal(stdout.trim(),"audio");
  } finally { await rm(dir,{recursive:true,force:true}); }
});
