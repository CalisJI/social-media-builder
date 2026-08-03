import test from "node:test";
import assert from "node:assert/strict";
import { buildPresentationTree, PresentationTreeError } from "../src/presentation/build-presentation-tree.mjs";

const job = Object.freeze({ content: Object.freeze({ word: "resilient", meaning_vi: "kiên cường", example_vi: "" }) });
const strategy = Object.freeze({ id: "definition-v1", requires: ["word", "meaning_vi"], optional: ["example_vi"], stages: [{ id: "word", role: "word", start: 0, duration: 1 }, { id: "meaning", role: "meaning_vi", start: 1, duration: 1 }] });
const template = Object.freeze({ id: "pastel-v1", scene: [{ id: "title", type: "text", text: "{word}" }, { id: "translation", type: "text", text: "{meaning_vi}" }, { id: "example", type: "text", text: "{example_vi}" }, { id: "card", type: "box", color: "#fff" }] });

test("builds a deterministic declarative tree without mutating source inputs", () => {
  const tree = buildPresentationTree({ job, strategy, template });
  assert.deepEqual(tree, {
    templateId: "pastel-v1",
    strategyId: "definition-v1",
    stages: [{ id: "word", role: "word", value: "resilient", start: 0, duration: 1 }, { id: "meaning", role: "meaning_vi", value: "kiên cường", start: 1, duration: 1 }],
    components: [{ id: "title", type: "text", text: "resilient" }, { id: "translation", type: "text", text: "kiên cường" }, { id: "card", type: "box", color: "#fff" }],
  });
  assert.equal(job.content.word, "resilient");
  assert.equal(template.scene[0].text, "{word}");
  assert.doesNotMatch(JSON.stringify(tree), /drawtext|filter_complex|\[0:v\]/i);
});

test("reports the missing required strategy field", () => {
  assert.throws(() => buildPresentationTree({ job: { content: { word: "resilient" } }, strategy, template }), error => error instanceof PresentationTreeError && error.code === "missing_strategy_field" && error.message === "strategy definition-v1 requires content.meaning_vi");
});

test("binds scene aliases to canonical normalized content", () => {
  const tree = buildPresentationTree({
    job: { content: { word: "resilient", meaning_vi: "kiên cường", part_of_speech: "adjective", example_en: "Stay resilient.", example_vi: "Hãy kiên cường." } },
    strategy,
    template: { id: "scene-v2", scene: [{ type: "text", text: "{meaning}" }, { type: "text", text: "{part}" }, { type: "text", text: "{exampleEn}" }, { type: "text", text: "{exampleVi}" }] },
  });
  assert.deepEqual(tree.components.map(component => component.text), ["kiên cường", "adjective", "Stay resilient.", "Hãy kiên cường."]);
});

test("splits only strategy-authorized stages, shifts the CTA, and records metadata", () => {
  const tree = buildPresentationTree({
    job: { content: { ...job.content, cta: "@daily" } },
    strategy: { ...strategy, splitScene: ["meaning"], duration: { max: 4 }, stages: [{ id: "meaning", role: "meaning_vi", start: 0, duration: 1 }, { id: "cta", role: "cta", start: 1, duration: 1 }] },
    template,
    splitScene: { stageId: "meaning", parts: ["kiên", "cường"] },
  });
  assert.deepEqual(tree.stages.map(({ id, start, value }) => [id, start, value]), [["meaning-1", 0, "kiên"], ["meaning-2", 1, "cường"], ["cta", 2, "@daily"]]);
  assert.deepEqual(tree.warnings, [{ code: "split_scene", stageId: "meaning", sceneCount: 2 }]);
  assert.deepEqual(tree.metadata, { split_scene: { stage_id: "meaning", scene_count: 2, duration: 3 } });
});

test("rejects unauthorized and overlong split scenes", () => {
  const splitScene = { stageId: "meaning", parts: ["kiên", "cường"] };
  const jobWithCta = { content: { ...job.content, cta: "@daily" } };
  assert.throws(() => buildPresentationTree({ job: jobWithCta, strategy, template, splitScene }), /does not allow split scenes/);
  assert.throws(() => buildPresentationTree({ job: jobWithCta, strategy: { ...strategy, splitScene: ["meaning"], duration: { max: 2 }, stages: [{ id: "meaning", role: "meaning_vi", start: 0, duration: 1 }, { id: "cta", role: "cta", start: 1, duration: 1 }] }, template, splitScene }), /exceeds strategy maximum/);
});
