import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { normalizePayload, payloadHash, RenderError, renderVideo, resolveTemplate, wrapText } from "../src/render.mjs";
import { validateStrategy } from "../src/strategy/resolve-strategy.mjs";
const exec = promisify(execFile);
const sample={template_id:"vocabulary-pastel-v1",duration_seconds:10,brand_handle:"@daily",entries:[{word:"resilient",ipa:"/test/",part_of_speech:"adjective",meaning_vi:"kiên cường",example_en:"Stay resilient.",example_vi:"Hãy kiên cường."}]};
test("normalizes CAL-30 payload and derives CTA",async()=>{const p=await normalizePayload(sample);assert.equal(p.duration,10);assert.match(p.cta,/@daily/);assert.equal(payloadHash(p),payloadHash(await normalizePayload(sample)));});
test("normalizes nested content and presentation payloads like legacy payloads",async()=>{
  const { entries, template_id, duration_seconds, ...request } = sample;
  const v2 = { ...request, content: entries[0], presentation: { template_id, duration_seconds } };
  assert.deepEqual(await normalizePayload(v2), await normalizePayload(sample));
});
test("defaults legacy requests to the classic definition strategy",async()=>{
  assert.equal((await normalizePayload(sample)).strategy,"classic-definition-v1");
});
test("resolves an explicit known strategy",async()=>{
  const payload = await normalizePayload({ ...sample, presentation: { strategy_id: "classic-definition-v1" } });
  assert.equal(payload.strategy,"classic-definition-v1");
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
test("registry swaps between two fixture packages",async()=>{assert.equal((await resolveTemplate("vocabulary-pastel-v1")).palette.accent,"#E85D75");assert.equal((await resolveTemplate("vocabulary-pastel-test-v1")).palette.accent,"#6E67D8");});
test("registry applies theme.json overrides",async()=>{const template=await resolveTemplate("vocabulary-pastel-test-v1");assert.equal(template.copy.hook,"THEME OVERRIDE");assert.equal(template.copy.meaningLabel,"MEANING");assert.equal(template.timeline.hook[0],0.1);});
test("registers the dark reference layout",async()=>{const template=await resolveTemplate("vocabulary-dark-reference-v1");assert.equal(template.layout.variant,"dark-slide");assert.equal(template.palette.accent,"#FF595E");});
test("rejects unknown template IDs",async()=>assert.rejects(resolveTemplate("missing-v1"),error=>error.status===400&&error.code==="unknown_template"));
test("wraps long content and enforces line bounds",()=>{assert.equal(wrapText("one two three four",7),"one two\nthree\nfour");assert.throws(()=>wrapText("one two three",3,2),/2 lines/);});

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
