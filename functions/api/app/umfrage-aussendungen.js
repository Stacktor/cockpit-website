import {imKontingent,json,pruefeAlphaLizenz} from '../../../lib/app-lizenz.js';
import {betrieb} from '../../../lib/admin/betrieb.js';
import {passt,quittieren,dispatchLaden} from '../../../lib/survey-dispatch.js';

/** Leichter Vordergrund-Poll, getrennt vom aufwändigeren Definitionsabruf. */
export async function onRequestPost({request,env}) {
  const d=await request.json().catch(()=>null);
  if(!d)return json(400,{ok:false,fehler:'Ungültige Anfrage.'});
  const p=await pruefeAlphaLizenz(env,d.schluessel,d.instanz);
  if(!p.ok)return json(p.status,{ok:false,fehler:p.fehler});
  if(!await imKontingent(env,`${p.lizenz.id}:${d.instanz}`,'dispatch',480))return json(429,{ok:false,fehler:'Zu viele Abfragen. Bitte kurz warten.'});
  const db=betrieb(env);
  if(!db)return json(200,{ok:true,umfragen:[],eingerichtet:false,revision:0});
  if(d.geoeffnet){
    const row=await dispatchLaden(env,d.geoeffnet,p.lizenz.id,d.version,d.system);
    if(row)await quittieren(env,row.id,p.lizenz.id,d.instanz,'opened');
  }
  const cursor=Number.isSafeInteger(d.revision)&&d.revision>=0?d.revision:0;
  const rows=await db.prepare(`SELECT d.* FROM survey_dispatch d WHERE d.seq>? ORDER BY d.seq LIMIT 100`).bind(cursor).all();
  const surveys=[];
  for(const row of rows.results||[]) {
    if(!passt(JSON.parse(row.audience),p.lizenz.id,d.version,d.system))continue;
    await quittieren(env,row.id,p.lizenz.id,d.instanz,'received');
    surveys.push(JSON.parse(row.definition));
  }
  return json(200,{ok:true,umfragen:surveys,eingerichtet:true,revision:rows.results?.at(-1)?.seq || cursor});
}
