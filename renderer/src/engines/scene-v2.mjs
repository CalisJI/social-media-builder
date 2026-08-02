import { spawn } from "node:child_process";
import { mkdir, rename, rm } from "node:fs/promises";
import path from "node:path";
import { compileScenes } from "../compiler/compile-scenes.mjs";

export const sceneV2 = Object.freeze({
  id: "scene-v2",
  async render({ payload, template, outputFile, ffmpeg, timeoutMs, font, saveText, RenderError }) {
    const work = `${outputFile}.work`;
    await rm(work, { recursive: true, force: true }); await mkdir(work, { recursive: true });
    const text = async (name, value) => saveText(work, name, value);
    const filter = await compileScenes({ scene: template.scene, template, payload, font, saveText: text });
    const temp = `${outputFile}.tmp.mp4`; await mkdir(path.dirname(outputFile), { recursive: true });
    const audioInputs = payload.backgroundMusicUrl ? ["-stream_loop", "-1", "-i", payload.backgroundMusicUrl] : [];
    const audioOutput = payload.backgroundMusicUrl ? ["-map", "1:a:0", "-c:a", "aac", "-b:a", process.env.RENDER_AUDIO_BITRATE || "128k"] : ["-an"];
    const args = ["-hide_banner", "-loglevel", "error", "-loop", "1", "-i", template.assets.background, ...audioInputs, "-filter_complex", filter, "-map", "[out]", ...audioOutput, "-t", String(payload.duration), "-c:v", "libx264", "-profile:v", "high", "-preset", process.env.RENDER_PRESET || "medium", "-crf", process.env.RENDER_CRF || "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-r", "30", "-y", temp];
    try {
      await new Promise((resolve, reject) => { const child = spawn(ffmpeg, args, { stdio: ["ignore", "ignore", "pipe"] }); let stderr = ""; const timer = setTimeout(() => { child.kill("SIGKILL"); reject(new RenderError(`render timed out after ${timeoutMs}ms`, 504, "render_timeout")); }, timeoutMs); child.stderr.on("data", chunk => stderr = (stderr + chunk).slice(-8000)); child.on("error", error => { clearTimeout(timer); reject(new RenderError(`cannot start ffmpeg: ${error.message}`)); }); child.on("exit", code => { clearTimeout(timer); code === 0 ? resolve() : reject(new RenderError(`ffmpeg exited ${code}: ${stderr.trim()}`)); }); });
      await rename(temp, outputFile);
    } finally { await rm(temp, { force: true }); await rm(work, { recursive: true, force: true }); }
  },
});
