import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { inspectArtifact } from "../src/qa/inspect-artifact.mjs";

const exec = promisify(execFile);
const expectation = { codec: "h264", width: 1080, height: 1920, duration: 1, frameRate: 30 };

async function artifact(dir, name, { size = "1080x1920", duration = 1 } = {}) {
  const output = path.join(dir, name);
  await exec("ffmpeg", ["-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i", `color=black:s=${size}:r=30`, "-t", String(duration), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-y", output]);
  return output;
}

test("inspects a valid H.264 vertical artifact", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "artifact-qa-"));
  try {
    const actual = await inspectArtifact(await artifact(dir, "valid.mp4"), expectation);
    assert.deepEqual(actual, expectation);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("rejects an empty artifact with structured QA details", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "artifact-qa-"));
  try {
    const output = path.join(dir, "empty.mp4");
    await writeFile(output, "");
    await assert.rejects(inspectArtifact(output, expectation), error => error.code === "artifact_qa_failed" && error.details.field === "size");
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("rejects an artifact with the wrong duration", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "artifact-qa-"));
  try {
    await assert.rejects(inspectArtifact(await artifact(dir, "short.mp4", { duration: 0.2 }), expectation), error => error.code === "artifact_qa_failed" && error.details.field === "duration");
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("rejects an artifact with the wrong dimensions", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "artifact-qa-"));
  try {
    await assert.rejects(inspectArtifact(await artifact(dir, "small.mp4", { size: "720x1280" }), expectation), error => error.code === "artifact_qa_failed" && error.details.field === "dimensions");
  } finally { await rm(dir, { recursive: true, force: true }); }
});
