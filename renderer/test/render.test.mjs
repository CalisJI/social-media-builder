import test from "node:test";
import assert from "node:assert/strict";
import { normalizePayload, payloadHash, RenderError, wrapText } from "../src/render.mjs";
const sample={duration_seconds:10,brand_handle:"@daily",entries:[{word:"resilient",ipa:"/test/",part_of_speech:"adjective",meaning_vi:"kiên cường",example_en:"Stay resilient.",example_vi:"Hãy kiên cường."}]};
test("normalizes CAL-30 payload and derives CTA",()=>{const p=normalizePayload(sample);assert.equal(p.duration,10);assert.match(p.cta,/@daily/);assert.equal(payloadHash(p),payloadHash(normalizePayload(sample)));});
test("rejects batches",()=>assert.throws(()=>normalizePayload({...sample,entries:[...sample.entries,...sample.entries]}),RenderError));
test("rejects out-of-range duration",()=>assert.throws(()=>normalizePayload({...sample,duration_seconds:30}),/duration_seconds/));
test("wraps long content without losing words",()=>assert.equal(wrapText("one two three four",7),"one two\nthree\nfour"));
