import { h, datum, zeit, relativ, mb, type Daten } from './dom';
import { api, aktion, badge, bestaetigen, feld, karte, knopf, kopierKnopf, leer, liste, schublade, schubladeZu, tabelle } from './ui';
import { dialogFenster } from './menue';
import { reiter } from './reiter';

const eventButton=(ev:Event)=>(ev.currentTarget instanceof HTMLButtonElement?ev.currentTarget:(ev.target as Element)?.closest('button')) as HTMLButtonElement|null;
const input=(attrs:Daten={})=>h('input',{class:'a-eingabe',...attrs}) as HTMLInputElement;
const select=(label:string,values:[string,string][])=>h('select',{class:'a-eingabe','aria-label':label},...values.map(([value,text])=>h('option',{value},text))) as HTMLSelectElement;
const stack=(...nodes:(Node|null|false)[])=>h('div',{class:'a-detail-stack'},...nodes);
const status=(l:Daten)=>l.archiviert?'archiviert':l.deaktiviert?'disabled':l.status;
const slots=(l:Daten)=>`${l.genutzt ?? '?'} / ${l.limit ?? '∞'}`;
const person=(l:Daten)=>h('div',{class:'a-person'},h('span',{class:'a-avatar','aria-hidden':'true'},String(l.kundenName||l.kunde||'?').slice(0,1).toUpperCase()),h('div',{},h('b',{},l.kundenName||'Ohne Namen'),h('div',{class:'a-klein a-blass'},l.kunde||'Keine E-Mail')));
function key(l:Daten) {
  const value=h('code',{class:'a-mono'},l.kurz||'—');
  const reveal=knopf('Anzeigen',()=>{value.textContent=l.schluessel||'—';reveal.remove();});
  return h('div',{class:'a-werkzeuge'},value,l.schluessel?reveal:null,l.schluessel?kopierKnopf(l.schluessel,'Lizenzschlüssel kopieren'):null);
}

export async function lizenzen(ziel:HTMLElement, _neu:()=>void) {
  let page=1, run=0;
  const search=input({type:'search',placeholder:'Person, E-Mail oder Lizenz suchen …','aria-label':'Lizenzen suchen'});
  const state=select('Lizenzstatus',[['','Alle Zustände'],['active','Aktiv'],['disabled','Gesperrt'],['expired','Abgelaufen']]);
  const archive=select('Archiv',[['','Aktuelle Lizenzen'],['ja','Archiv'],['alle','Mit Archiv']]);
  const platform=input({placeholder:'System filtern','aria-label':'Betriebssystem'});
  const version=input({placeholder:'Version filtern','aria-label':'App-Version'});
  const filters=h('form',{class:'a-filterbar'},search,state,archive,platform,version) as HTMLFormElement;
  const content=h('div');
  const header=h('div',{class:'a-werkzeuge a-mb'},h('p',{class:'a-luecke a-klein a-blass'},'Persönliche Zugänge. Schlüssel werden erst auf Wunsch sichtbar.'),knopf('Lizenz anlegen',()=>create(reload),'a-p','plus'));
  ziel.append(header,filters,content);
  filters.addEventListener('submit',e=>{e.preventDefault();page=1;void reload();});
  let timer:ReturnType<typeof setTimeout>;
  for(const field of [search,platform,version]) field.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(()=>{page=1;void reload();},250);});
  for(const field of [state,archive]) field.addEventListener('change',()=>{page=1;void reload();});
  async function reload() {
    const current=++run;
    try {
      const params=new URLSearchParams({q:search.value,status:state.value,archiv:archive.value,system:platform.value,version:version.value,seite:String(page),limit:'50'});
      const d=await api(`lizenzen?${params}`);
      if(current!==run)return;
      const bulk=(action:string,label:string)=>(rows:Daten[])=>{
        if(!rows.length)return;
        void (async()=>{
          if(await bestaetigen(`${rows.length} Lizenzen ${label}?`,'Die Änderung gilt beim Anbieter. Endgültiges Löschen und Speicherbereinigung sind Einzelaktionen.','Ausführen'))
            await aktion(null,()=>api('lizenzen',{ids:rows.map(l=>l.id),aktion:action}),()=>void reload());
        })();
      };
      const table=tabelle([
        {titel:'Person',wert:person,suche:l=>`${l.kundenName} ${l.kunde}`},
        {titel:'Zugang',wert:l=>h('div',{},badge(status(l)),h('div',{class:'a-klein a-blass'},`${l.anbieter||'Altbestand'} · ${l.kurz||l.id}`))},
        {titel:'Geräte',wert:slots,klasse:'a-zahl'},
        {titel:'Letzte Bestätigung',wert:l=>l.letzteBestaetigung?relativ(l.letzteBestaetigung):l.ping?relativ(l.ping.zeit):'Noch keine'},
        {titel:'Version / System',wert:l=>l.versionen?.length?`${l.versionen.join(', ')} · ${l.systeme.join(', ')}`:l.ping?`${l.ping.version||'?'} · ${l.ping.system||'?'}`:'—'},
        {titel:'Laufzeit',wert:l=>l.laeuftAb?datum(l.laeuftAb):'Unbefristet'},
      ],d.lizenzen,{suche:false,beiKlick:l=>void detail(l.id,reload),leerText:'Keine Lizenzen für diese Filter.',auswahl:{schluessel:l=>l.id,aktionen:[
        {titel:'Sperren',klasse:'a-rot',aus:bulk('sperren','sperren')},
        {titel:'Freigeben',aus:bulk('entsperren','freigeben')},
        {titel:'Archivieren',aus:bulk('archivieren','archivieren')},
      ]}});
      const previous=knopf('Zurück',()=>{page--;void reload();});previous.disabled=page<=1;
      const next=knopf('Weiter',()=>{page++;void reload();});next.disabled=page>=d.seiten;
      content.replaceChildren(...[
        ...(d.warnungen||[]).map((text:string)=>h('div',{class:'a-hinweis a-mb',role:'alert'},text)),
        d.lizenzen.some((l:Daten)=>l.geraetefehler)?h('div',{class:'a-hinweis a-mb'},'Geräte konnten beim Anbieter nicht vollständig geladen werden. Unbekannte Belegungen stehen als „?“ in der Liste.'):null,
        !d.indexBereit?h('div',{class:'a-hinweis a-mb'},'D1 noch nicht verbunden. Anbieterzugriffe funktionieren; Archiv, Speicherzuordnung und Geräteverlauf benötigen BETRIEB.'):null,
        karte(null,table),h('div',{class:'a-werkzeuge a-mt'},h('span',{class:'a-luecke a-klein'},`${d.gesamt} Lizenzen · Seite ${d.seite} von ${d.seiten}`),previous,next),
      ].filter((n):n is HTMLElement=>n!==null));
    } catch(e) {if(current===run)content.replaceChildren(h('div',{class:'a-hinweis a-fehler'},(e as Error).message));}
  }
  await reload();
}
function create(reload:()=>Promise<void>) {
  const name=input({required:true,autocomplete:'name',maxlength:100,placeholder:'Vor- und Nachname'});
  const mail=input({required:true,type:'email',autocomplete:'email',maxlength:254,placeholder:'person@beispiel.de'});
  const form=h('form',{class:'a-detail-stack'},feld('Name',name),feld('E-Mail',mail),h('p',{class:'a-klein a-blass'},'Persönlicher Alpha-Zugang für drei Geräte. Eine bestehende Zuordnung wird wiederverwendet. Die Anlage versendet keine Mail.')) as HTMLFormElement;
  const save=knopf('Lizenz anlegen',()=>{},'a-p');save.type='submit';form.append(save);
  const close=dialogFenster('Alpha-Lizenz anlegen',form);
  form.addEventListener('submit',e=>{e.preventDefault();void aktion(save,async()=>{
    const r=await api('lizenzen',{aktion:'alpha-anlegen',name:name.value,mail:mail.value});
    close();await reload();await detail(r.lizenz.id,reload);return r;
  });});
}
async function detail(id:string,reload:()=>Promise<void>) {
  schublade('Zugang wird geladen …',leer('Lizenz und Geräte werden beim Anbieter abgefragt.'));
  let d:Daten;
  try{d=await api(`lizenzen?id=${encodeURIComponent(id)}`);}catch(e){schublade('Lizenz',h('div',{class:'a-hinweis a-fehler'},(e as Error).message));return;}
  const l=d.lizenz;
  const action=(data:Daten)=>(ev:Event)=>void aktion(eventButton(ev),()=>api('lizenzen',{id,...data}),async()=>{await reload();await detail(id,reload);});
  const confirm=(data:Daten,title:string,text:string)=>(ev:Event)=>void (async()=>{if(await bestaetigen(title,text,'Bestätigen'))action(data)(ev);})();
  const overview=()=>{
    const editable=id.startsWith('keygen:');
    const name=input({value:l.kundenName||'',required:true,'aria-label':'Name'}),mail=input({value:l.kunde||'',type:'email',required:true,'aria-label':'E-Mail'});
    const limit=input({type:'number',min:1,max:100,value:l.limit??3,'aria-label':'Gerätelimit'});
    const expiry=input({type:'date',value:l.laeuftAb?.slice(0,10)||'','aria-label':'Gültig bis'});
    const note=h('textarea',{class:'a-eingabe',rows:3,maxlength:2000,'aria-label':'Interne Notiz'},l.notiz||'') as HTMLTextAreaElement;
    return stack(
      liste([['Zustand',badge(status(l))],['Schlüssel',key(l)],['Geräteplätze',slots(l)],['Letzter Kontakt',l.letzterKontakt?zeit(l.letzterKontakt):l.ping?zeit(l.ping.zeit):'Noch keiner'],['Letzte Anbieterbestätigung',l.letzteBestaetigung?zeit(l.letzteBestaetigung):'Noch nicht erfasst'],['Erstellt',zeit(l.erstellt)]]),
      editable?karte('Person',feld('Name',name),feld('E-Mail',mail),knopf('Person speichern',e=>action({aktion:'person',name:name.value,mail:mail.value})(e))):karte('Person',liste([['Name',l.kundenName],['E-Mail',l.kunde]])),
      karte('Zugang',feld('Maximale Geräte',limit),knopf('Gerätelimit speichern',e=>action({aktion:'geraete',limit:Number(limit.value)})(e)),editable?feld('Gültig bis (leer = unbefristet)',expiry):null,editable?knopf('Laufzeit speichern',e=>action({aktion:'ablauf',datum:expiry.value?`${expiry.value}T23:59:59.000Z`:null})(e)):knopf('Um 30 Tage verlängern',action({aktion:'verlaengern',tage:30})),
        h('div',{class:'a-werkzeuge a-mt'},knopf(l.deaktiviert?'Freigeben':'Sperren',confirm({aktion:l.deaktiviert?'entsperren':'sperren'},'Zugang ändern?','Die Alpha ist nach einer Sperrung bei der nächsten Lizenzprüfung nicht mehr nutzbar. Lokale Daten bleiben erhalten.')))),
      karte('Interne Notiz',note,knopf('Notiz speichern',e=>action({aktion:'notiz',text:note.value})(e))),
      l.id.startsWith('keygen:')?karte('Archiv',h('p',{class:'a-klein'},'Archivieren sperrt den Zugang. Verschlüsselter Speicher wird separat verwaltet.'),knopf(l.archiviert?'Wiederherstellen':'Archivieren',confirm({aktion:l.archiviert?'wiederherstellen':'archivieren'},l.archiviert?'Zugang wiederherstellen?':'Lizenz archivieren?','Die Person und ihre Speicherzuordnung bleiben auffindbar.')),
        l.archiviert?knopf('Endgültig löschen',()=>deleteDialog(l,reload),'a-rot'):null):null,
    );
  };
  const devices=()=>stack(h('p',{class:'a-klein a-blass'},`${slots(l)} Plätze belegt. „?“ bedeutet: Anbieter hat noch keine verlässliche Zahl geliefert.`),
    d.geraete.length?tabelle([
      {titel:'Gerät',wert:g=>g.name||'Ohne Namen'},
      {titel:'System / Version',wert:g=>`${g.system||'—'} · ${g.version||'—'}`},
      {titel:'Letzter Kontakt',wert:g=>g.zuletzt?relativ(g.zuletzt):'Unbekannt'},
      {titel:'',wert:g=>knopf('Abmelden',confirm({aktion:'geraet-abmelden',instanz:g.identifier||g.id},'Gerät abmelden?',`„${g.name||'Dieses Gerät'}“ verliert seinen Zugang. Der Platz wird frei.`),'a-rot')},
    ],d.geraete,{suche:false}):leer('Noch kein Gerät aktiviert.'));
  const storage=()=>{
    if(!d.sync)return leer('Der verschlüsselte Speicher ist noch nicht verbunden.');
    const s=d.sync;
    const purge=(part:string,label:string)=>knopf(label,e=>void(async()=>{
      if(!await bestaetigen(label+'?', 'Nur die ausgewählten Serverdateien werden gelöscht. Lokale Dateien bleiben. Geräte können Daten erneut hochladen.','Dateien löschen'))return;
      await aktion(eventButton(e),()=>api('sync',{lizenz:id,aktion:part}),async()=>{await reload();await detail(id,reload);});
    })(),'a-rot');
    return stack(liste([['Person',`${l.kundenName||''} · ${l.kunde||''}`],['Lizenz-ID',h('code',{},id)],['Sync',`${mb(s.belegt)} · ${s.dateien} Dateien`],['Sicherungen',`${mb(s.sicherungen?.belegt||0)} · ${s.sicherungen?.dateien||0} Dateien`]]),
      h('p',{class:'a-klein a-blass'},'Dieser Namensraum gehört dauerhaft zur Lizenz und wird von ihren Geräten geteilt. Inhalte sind Ende-zu-Ende verschlüsselt. Der Lizenzschlüssel ist kein Speicherschlüssel.'),
      h('div',{class:'a-werkzeuge'},purge('sync-leeren','Sync-Pakete löschen'),purge('sicherungen-leeren','Cloud-Sicherungen löschen')));
  };
  const history=()=>d.verlauf?.length?h('ol',{class:'a-zeitleiste'},...d.verlauf.map((e:Daten)=>h('li',{},h('b',{},e.aktion),h('p',{class:'a-klein'},`${zeit(e.zeit)} · ${e.benutzer||'Admin'}`)))):leer('Noch keine Verwaltungsaktionen.');
  schublade(l.kundenName||l.kunde||'Lizenz',h('div',{class:'a-mb'},person(l)),reiter([{titel:'Übersicht',inhalt:overview},{titel:`Geräte (${d.geraete.length})`,inhalt:devices},{titel:'Speicher',inhalt:storage},{titel:'Verlauf',inhalt:history}]));
}
function deleteDialog(l:Daten,reload:()=>Promise<void>) {
  const confirmId=input({placeholder:l.id,required:true,'aria-label':'Lizenz-ID zur Bestätigung'});
  const form=h('form',{class:'a-detail-stack'},h('p',{},'Endgültiges Löschen entfernt die Lizenz und alle Aktivierungen bei Keygen. Die verschlüsselten Serverdaten bleiben separat auffindbar.'),h('code',{},l.id),feld('Zum Bestätigen die Lizenz-ID eingeben',confirmId)) as HTMLFormElement;
  const remove=knopf('Lizenz endgültig löschen',()=>{},'a-rot');remove.type='submit';form.append(remove);
  const close=dialogFenster('Endgültig löschen',form);
  form.addEventListener('submit',e=>{e.preventDefault();void aktion(remove,async()=>{
    const r=await api('lizenzen',{id:l.id,aktion:'loeschen',bestaetigung:confirmId.value});close();schubladeZu();await reload();return r;
  });});
}
