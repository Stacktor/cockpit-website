import {h,datum,relativ,type Daten} from './dom';
import {api,aktion,badge,bestaetigen,karte,knopf,leer} from './ui';
import type {Bereich} from './bereiche';
export const releases:Bereich=async(ziel,neu)=>{
  const d=await api('releases');
  const header=h('div',{class:'a-karte'},h('h2',{},'Änderungen prüfen → Dev testen → Alpha freigeben'),h('p',{class:'a-klein'},'Dev ist dein Testbereich. Alpha ist die bewusst freigegebene Ausgabe für eingeladene Personen.'));
  ziel.append(header);
  if(!d.freigabeVerbunden)ziel.append(karte('Freigaben noch verbinden',h('p',{},'Die Übersicht ist lesbar. Für die Knöpfe fehlt noch der begrenzte Freigabeanschluss.'),h('a',{href:'#/einstellungen'},'Verbindung einrichten →')));
  const changes=d.aenderungen||[];
  const test=knopf('Zum Testen bereitstellen',()=>void (async()=>{
    if(!await bestaetigen('Dev-Build erstellen?','Der aktuelle Stand wird für Windows und Mac gebaut. Die Alpha bleibt dabei bestehen.','Testbuild erstellen'))return;
    await aktion(test,()=>api('releases',{aktion:'testen',sha:d.dev}),neu);
  })());test.disabled=!d.freigabeVerbunden;
  ziel.append(karte('Aktuelle Änderungen',changes.length?h('div',{class:'a-detail-stack'},...changes.map((c:Daten)=>h('div',{},badge(c.art),h('span',{},' '+c.text)))):leer('Keine neuen Produktänderungen gegenüber der Alpha-Quelle.'),h('div',{class:'a-werkzeuge a-mt'},test)));
  if(d.offen?.length)ziel.append(h('details',{class:'a-karte'},h('summary',{},`Noch in Vorbereitung (${d.offen.length})`),h('p',{class:'a-klein'},'Noch nicht Teil eines fertigen Testbuilds.'),...d.offen.map((p:Daten)=>h('div',{class:'a-zitat'},h('strong',{},String(p.titel).replace(/^(feat|fix|docs)(\([^)]*\))?:\s*/,'')),h('small',{},p.status)))));
  ziel.append(karte('Dev · zum Ausprobieren',...(d.builds?.length?d.builds.map((b:Daten)=>{
    const alpha=knopf('Für Alpha freigeben',()=>void (async()=>{
      if(!await bestaetigen(`Build ${b.nummer} für Alpha freigeben?`,'Genau dieser getestete Stand wird übernommen und ohne Dev-Werkzeuge neu gebaut. Erst nach erfolgreichen Plattform- und Signaturprüfungen erhalten Alpha-Nutzer das Update.','Alpha freigeben'))return;
      await aktion(alpha,()=>api('releases',{aktion:'alpha',sha:b.sha}),neu);
    })());alpha.disabled=!d.freigabeVerbunden||!b.freigabefaehig;
    const reason=b.sha!==d.dev?'Ein neuerer Entwicklungsstand ist vorhanden.':!b.freigabefaehig?'Beide Testbuilds müssen für genau diesen Stand erfolgreich sein.':'Bereit für deine Entscheidung.';
    return h('article',{class:'a-karte'},h('div',{class:'a-werkzeuge'},h('h3',{},`Build ${b.nummer}`),badge(b.freigabefaehig?'Bereit':'Dev')),h('p',{},String(b.titel||'Entwicklungsstand').replace(/\s*\(#\d+\)$/,'')),h('small',{},`${b.version||'Dev'} · ${relativ(b.zeit)}`),...(b.aenderungen||[]).map((c:Daten)=>h('p',{},badge(c.art),h('span',{},' '+c.text))),h('div',{class:'a-werkzeuge a-mt'},...(b.systeme||[]).map((s:Daten)=>h('span',{},`${s.name}: `,badge(s.status)))),h('p',{class:'a-klein'},reason),alpha,h('details',{class:'a-mt'},h('summary',{},'Technische Details'),h('code',{},b.sha),...(b.systeme||[]).map((s:Daten)=>h('p',{},h('a',{href:s.url,target:'_blank',rel:'noopener'},`${s.name} · Bauprotokoll`)))));
  }):[leer('Noch kein Dev-Build vorhanden. Oben einen Testbuild anfordern.')])))
  ziel.append(karte('Alpha · Freigabeverlauf',...(d.freigaben?.length?d.freigaben.map((r:Daten)=>h('div',{class:'a-zitat'},h('strong',{},r.titel),badge(r.status),h('small',{},datum(r.zeit)),h('details',{},h('summary',{},'Technische Details'),h('a',{href:r.url,target:'_blank',rel:'noopener'},'Bauprotokoll öffnen')))):[leer('Noch keine Freigabe angefordert.')])),karte('Aktuelle Alpha herunterladen',h('p',{},'Hier liegt ausschließlich die veröffentlichte Alpha. Dev-Vorschauen werden übersprungen.'),h('a',{href:'https://github.com/Stacktor/cockpit-releases/releases/latest',target:'_blank',rel:'noopener'},'Signierte Alpha-Downloads öffnen →')));
};
