import { execFile } from "node:child_process";
import { stat } from "node:fs/promises";
import { promisify } from "node:util";

const exec = promisify(execFile);

export class ArtifactQaError extends Error {
  constructor(field, expected, actual) {
    super(`artifact QA failed: ${field}`);
    this.status = 500;
    this.code = "artifact_qa_failed";
    this.details = { field, expected, actual };
  }
}

const frameRate = value => {
  const [numerator, denominator = 1] = String(value).split("/").map(Number);
  return numerator / denominator;
};

export async function inspectArtifact(file, expected) {
  const { size } = await stat(file);
  if (!size) throw new ArtifactQaError("size", "> 0", size);
  let probe;
  try {
    const { stdout } = await exec(process.env.FFPROBE_PATH || "ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=codec_name,width,height,r_frame_rate:format=duration", "-of", "json", file]);
    probe = JSON.parse(stdout);
  } catch {
    throw new ArtifactQaError("probe", "readable MP4", "unreadable");
  }
  const stream = probe.streams?.[0];
  const actual = { codec: stream?.codec_name, width: stream?.width, height: stream?.height, duration: Number(probe.format?.duration), frameRate: frameRate(stream?.r_frame_rate) };
  for (const field of ["codec", "width", "height", "frameRate"]) if (actual[field] !== expected[field]) throw new ArtifactQaError(field === "width" || field === "height" ? "dimensions" : field, field === "width" || field === "height" ? `${expected.width}x${expected.height}` : expected[field], field === "width" || field === "height" ? `${actual.width}x${actual.height}` : actual[field]);
  if (!Number.isFinite(actual.duration) || Math.abs(actual.duration - expected.duration) > 0.25) throw new ArtifactQaError("duration", expected.duration, actual.duration);
  return actual;
}
