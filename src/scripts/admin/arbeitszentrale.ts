import { h, relativ, type Daten } from './dom';
import { api, karte, kpi, leer, liste } from './ui';

/** Die Startseite zeigt Entscheidungen und Probleme, Detailanalysen leben in ihren Bereichen. */
export async function arbeitszentrale(ziel:HTMLElement,_neu:()=>void) {
  const d=await api('uebersicht');
  const count=(source:Daten,key:string)=>source?.ok?String(source[key]??0):'—';
  ziel.append(h('div',{class:'a-raster a-r4'},
    kpi('Neue Anmeldungen',d.alpha?.ok?String(d.alpha.nachStatus?.find((s:Daten)=>s.name==='neu')?.anzahl||0):'—','warten auf deine Entscheidung'),
    kpi('Aktive Zugänge',count(d.lizenzen,'aktiv'),'persönliche Lizenzen'),
    kpi('Offene Fehler',count(d.fehler,'offen'),'neu oder in Arbeit'),
    kpi('Mailprobleme',count(d.mails,'probleme'),'fehlgeschlagene Zustellung'),
  ));
  const tasks:{title:string;text:string;href:string}[]=[];
  if(d.alpha?.neueste?.some((p:Daten)=>p.status==='neu'))tasks.push({title:'Alpha-Anmeldungen prüfen',text:'Neue Personen warten auf eine Entscheidung.',href:'#/alpha'});
  if(d.fehler?.offen)tasks.push({title:`${d.fehler.offen} Fehlerberichte bearbeiten`,text:'Meldungen einordnen, beantworten und abschließen.',href:'#/fehler'});
  if(d.mails?.probleme)tasks.push({title:'Zustellprobleme prüfen',text:'Einladungen erreichen möglicherweise ihr Ziel nicht.',href:'#/mail'});
  for(const [key,label] of [['lizenzen','Lizenzdienst'],['sync','Speicher'],['mails','Maildienst']] as const){
    if(d[key]&&!d[key].ok)tasks.push({title:`${label} prüfen`,text:d[key].hinweis||d[key].fehler||'Verbindung nicht bestätigt.',href:'#/einstellungen'});
  }
  ziel.append(karte('Als Nächstes',tasks.length?h('div',{class:'a-detail-stack'},...tasks.map(t=>h('a',{class:'a-person',href:t.href},h('span',{class:'a-avatar','aria-hidden':'true'},'→'),h('span',{},h('b',{},t.title),h('div',{class:'a-klein a-blass'},t.text))))):leer('Aktuell keine dringenden Aufgaben aus den verbundenen Quellen.')));
  ziel.append(h('div',{class:'a-raster a-r2'},
    karte('Zuletzt im Betrieb',d.protokoll?.ok===false?leer('Protokoll nicht erreichbar.'):liste((Array.isArray(d.protokoll)?d.protokoll:[]).slice(0,5).map((e:Daten)=>[e.aktion,relativ(e.zeit)]))),
    karte('Schnellzugriff',liste([
      ['Zugang verwalten',h('a',{href:'#/lizenzen'},'Lizenzen und Geräte →')],
      ['Tester verstehen',h('a',{href:'#/umfragen'},'Umfragen und Antworten →')],
      ['Version prüfen',h('a',{href:'#/builds'},'Downloads und Builds →')],
      ['Projektwissen',h('a',{href:'#/doku'},'Dokumentation →')],
    ])),
  ));
  const missing=Object.entries(d).filter(([,value])=>value&&typeof value==='object'&&(value as Daten).ok===false);
  if(missing.length)ziel.append(h('p',{class:'a-klein a-blass'},`${missing.length} Quellen sind nicht bestätigt. Fehlende Daten werden als „—“ angezeigt.`));
}
