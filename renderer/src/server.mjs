import http from "node:http";
import path from "node:path";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { normalizePayload, payloadHash, readJson, RenderError, renderVideo } from "./render.mjs";

const port = Number(process.env.RENDERER_PORT || 3100);
const outputDir = path.resolve(process.env.RENDER_OUTPUT_DIR || "./data/renders");
const manifestFile = path.join(outputDir, "manifest.json");
const maxBody = Number(process.env.RENDER_MAX_BODY_BYTES || 65536);
const publicBase = (process.env.RENDER_PUBLIC_BASE_URL || `http://localhost:${port}/files`).replace(/\/$/, "");
const active = new Map();
let manifestWrites = Promise.resolve();
await mkdir(outputDir, { recursive: true });

const json = (res, status, body) => { res.writeHead(status, { "content-type": "application/json; charset=utf-8" }); res.end(JSON.stringify(body)); };
async function body(req) { const chunks=[]; let size=0; for await (const chunk of req) { size += chunk.length; if(size>maxBody) throw new RenderError("request body too large",413,"body_too_large"); chunks.push(chunk); } try{return JSON.parse(Buffer.concat(chunks).toString("utf8"));}catch{throw new RenderError("invalid JSON",400,"invalid_json");} }
const safeKey = key => typeof key === "string" && /^[A-Za-z0-9][A-Za-z0-9._-]{7,127}$/.test(key);
async function saveManifest(manifest) { const tmp=`${manifestFile}.tmp`; await writeFile(tmp, JSON.stringify(manifest,null,2)); await rename(tmp,manifestFile); }
function recordCompletion(key, record) {
  manifestWrites = manifestWrites.then(async () => { const current=await readJson(manifestFile,{}); current[key]=record; await saveManifest(current); });
  return manifestWrites;
}

async function createRender(req, res) {
  const key = req.headers["idempotency-key"]; if(!safeKey(key)) throw new RenderError("Idempotency-Key must be 8-128 URL-safe characters",400,"invalid_idempotency_key");
  const payload=await normalizePayload(await body(req)); const hash=payloadHash(payload); const filename=`${key}.mp4`; const output=path.join(outputDir,filename);
  const manifest=await readJson(manifestFile,{}); const existing=manifest[key];
  if(existing && existing.hash!==hash) throw new RenderError("idempotency key was already used with a different payload",409,"idempotency_conflict");
  if(existing) { try { await stat(output); return json(res,200,{status:"completed",cached:true,idempotencyKey:key,sha256:hash,url:`${publicBase}/${filename}`}); } catch {} }
  let running=active.get(key);
  if(running && running.hash!==hash) throw new RenderError("idempotency key is rendering a different payload",409,"idempotency_conflict");
  if(!running) { const promise=(async()=>{ await renderVideo(payload,output); await recordCompletion(key,{hash,filename,completedAt:new Date().toISOString()}); })().finally(()=>active.delete(key)); running={hash,promise}; active.set(key,running); }
  await running.promise; return json(res,201,{status:"completed",cached:false,idempotencyKey:key,sha256:hash,url:`${publicBase}/${filename}`});
}

const server=http.createServer(async(req,res)=>{ try {
  const url=new URL(req.url,"http://renderer");
  if(req.method==="GET" && url.pathname==="/healthz") return json(res,200,{status:"ok",activeRenders:active.size});
  if(req.method==="POST" && url.pathname==="/v1/renders") return await createRender(req,res);
  if(req.method==="GET" && url.pathname.startsWith("/files/")) { const name=decodeURIComponent(url.pathname.slice(7)); if(!/^[A-Za-z0-9][A-Za-z0-9._-]*\.mp4$/.test(name)) throw new RenderError("not found",404,"not_found"); const data=await readFile(path.join(outputDir,name)); res.writeHead(200,{"content-type":"video/mp4","content-length":data.length,"cache-control":"public, max-age=31536000, immutable"}); return res.end(data); }
  throw new RenderError("not found",404,"not_found");
} catch(error) { const status=error.status||500; console.error(JSON.stringify({level:"error",code:error.code||"internal_error",message:error.message,path:req.url})); if(!res.headersSent) json(res,status,{error:error.code||"internal_error",message:status<500?error.message:"render failed"}); else res.end(); } });
server.requestTimeout=Number(process.env.HTTP_REQUEST_TIMEOUT_MS||130000); server.headersTimeout=10000;
server.listen(port,"0.0.0.0",()=>console.log(JSON.stringify({level:"info",message:"renderer listening",port,outputDir})));
