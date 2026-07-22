import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const w=JSON.parse(await readFile(new URL("../workflows/social-workspace.json",import.meta.url))),s=JSON.stringify(w),n=new Map(w.nodes.map(x=>[x.name,x]));
assert.equal(w.active,false); assert.match(n.get("Validate Batch 1-50").parameters.jsCode,/length>50/); assert.match(s,/idempotency/i);
for(const name of ["Render Video","Download Rendered MP4","Upload Pending MP4 to R2","Create TikTok Draft via Backend"]){const x=n.get(name);assert.equal(x.retryOnFail,true);assert.ok(x.maxTries<=3);assert.ok(x.waitBetweenTries>=2000)}
assert.match(s,/timeout/);assert.match(s,/RETRYABLE/);assert.match(s,/NON_RETRYABLE/);assert.ok(s.includes("cal-3/pending/"));assert.match(s,/Wait Until Scheduled Time/);
assert.doesNotMatch(s,/PUBLIC_TO_EVERYONE|MUTUAL_FOLLOW_FRIENDS|FOLLOWER_OF_CREATOR|secretAccessKey|access_token|client_secret/i);assert.match(n.get("Prepare Draft Backend Request").parameters.jsCode,/mode:'draft'/);
console.log(`Validated ${w.name}: ${w.nodes.length} nodes; inactive, draft-only, secret-free invariants passed.`);
