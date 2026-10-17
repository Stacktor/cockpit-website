import assert from 'node:assert/strict';
import {testedBuilds} from '../lib/admin/releases.js';
import {onRequestPost} from '../functions/api/admin/releases.js';
const sha='a'.repeat(40),other='b'.repeat(40);
const run=(file,id=1,conclusion='success')=>({id,path:'.github/workflows/'+file,head_sha:sha,head_branch:'dev',status:'completed',conclusion,run_number:57,created_at:'2026-10-17T00:00:00Z'});
const runs=[run('dev.yml'),run('dev-mac.yml')];
assert(testedBuilds(runs,sha));assert(!testedBuilds(runs,other));
assert(!testedBuilds([...runs,run('dev.yml',2,'failure')],sha),'neuer Fehlversuch sperrt Freigabe');
const request=b=>new Request('https://cockpit.mesco.cc/api/admin/releases',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(b)});
let writes=[];let current=sha;
globalThis.fetch=async(url,init={})=>{
 const p=new URL(url).pathname;
 if(p==='/repos/Stacktor/cockpit-releases/releases')return new Response('[]');
 if(init.method){writes.push({url,body:JSON.parse(init.body)});return new Response(null,{status:204});}
 const value=p.endsWith('/git/ref/heads/dev')?{object:{sha:current}}:p.endsWith('/git/ref/heads/main')?{object:{sha:other}}:p.includes('/git/commits/')?{tree:{sha:p.endsWith(sha)?'dev-tree':'main-tree'}}:p.endsWith('/actions/runs')?{workflow_runs:runs}:p.endsWith('/pulls')?[]:p.includes('/compare/')?{commits:[]}:null;
 assert.notEqual(value,null,'fest erlaubter Leseweg');return new Response(JSON.stringify(value));
};
const data={env:{GITHUB_RELEASE_TOKEN:'test-only'},benutzer:'test'};
let r=await onRequestPost({request:request({aktion:'alpha',sha}),data});assert.equal(r.status,202);assert.equal(writes[0].body.ref,'main');assert.equal(writes[0].body.inputs.sha,sha);assert.match(writes[0].url,/admin-release.yml\/dispatches$/);
writes=[];current=other;r=await onRequestPost({request:request({aktion:'alpha',sha}),data});assert.equal(r.status,409);assert.equal(writes.length,0);
r=await onRequestPost({request:request({aktion:'testen',sha}),data:{env:{}}});assert.equal(r.status,503);
r=await onRequestPost({request:request({aktion:'shell',sha}),data});assert.equal(r.status,400);
current=sha;writes=[];r=await onRequestPost({request:request({aktion:'testen',sha}),data});assert.equal(r.status,202);assert.equal(writes.length,2);assert(writes.every(w=>w.body.ref==='dev'&&w.body.inputs.expected_sha===sha));
console.log('Freigaben: exakter Stand, neuester Test, feste Workflows und fehlender Anschluss geprüft.');
