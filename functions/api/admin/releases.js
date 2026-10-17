import {json} from '../../../lib/admin/zugang.js';
import {protokolliere} from '../../../lib/admin/protokoll.js';
import {releaseGithub,releaseState,testedBuilds} from '../../../lib/admin/releases.js';
export async function onRequestGet({data}){
  try { const {runs,...view}=await releaseState(data.env);return json(200,view); }
  catch(e){return json(502,{fehler:e.message});}
}
export async function onRequestPost({request,data}){
  const env=data.env;
  if(!env.GITHUB_RELEASE_TOKEN)return json(503,{fehler:'Freigaben sind noch nicht verbunden. Unter Einstellungen den begrenzten Freigabeanschluss einrichten.'});
  let b;try{b=await request.json();}catch{return json(400,{fehler:"Ungültiger Auftrag."});}
  if(!b||typeof b!=="object")return json(400,{fehler:"Ungültiger Auftrag."});
  if(!['testen','alpha'].includes(b.aktion)||!/^[a-f0-9]{40}$/.test(b.sha||''))return json(400,{fehler:'Ungültiger Freigabeauftrag.'});
  try {
    const state=await releaseState(env);
    if(state.dev!==b.sha)return json(409,{fehler:'Ein neuerer Stand ist vorhanden. Übersicht aktualisieren und erneut auswählen.'});
    if(b.aktion==='alpha'&&state.gleicherStand)return json(409,{fehler:'Dieser Quellstand ist bereits in der Alpha-Quelle enthalten.'});
    if(b.aktion==='alpha'&&!testedBuilds(state.runs,b.sha))return json(409,{fehler:'Für genau diesen Stand fehlen erfolgreiche Windows- und Mac-Testbuilds.'});
    const workflow=b.aktion==='alpha'?'admin-release.yml':'dev.yml';
    const key=`release:request:${b.aktion}:${b.sha}`;
    const previous=env.ALPHA?await env.ALPHA.get(key):null;
    if(previous&&Date.now()-Number(previous)<30000)return json(202,{ok:true,meldung:'Dieser Auftrag wurde bereits angefordert. Den Status gleich neu laden.'});
    const result=await releaseGithub(env,`actions/workflows/${workflow}/dispatches`,{method:'POST',body:JSON.stringify({ref:b.aktion==='alpha'?'main':'dev',inputs:b.aktion==='alpha'?{sha:b.sha}:{expected_sha:b.sha}})});
    if(b.aktion==='testen')await releaseGithub(env,'actions/workflows/dev-mac.yml/dispatches',{method:'POST',body:JSON.stringify({ref:'dev',inputs:{expected_sha:b.sha}})});
    if(env.ALPHA)await env.ALPHA.put(key,String(Date.now()),{expirationTtl:60});
    await protokolliere(env,data.benutzer,b.aktion==='alpha'?'Alpha-Freigabe angefordert':'Dev-Testbuild angefordert',b.sha);
    return json(202,{ok:true,meldung:b.aktion==='alpha'?'Alpha-Freigabe angefordert. Erst nach vollständigem Build und Signaturprüfung verfügbar.':'Windows- und Mac-Testbuild angefordert.',lauf:result?.html_url||null});
  }catch(e){return json(502,{fehler:e.message});}
}
