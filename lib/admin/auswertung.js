/**
 * Auswertung der Umfragen: je Frage passend zum Typ, NPS, Van-Westendorp-
 * Preispunkte (für Fragebögen mit zuBillig/guenstig/teuer/zuTeuer) und die
 * beendete Web-Preisumfrage („umfrage:*“).
 */
import { hinweis } from "./daten.js";

export function median(werte) {
  if (!werte.length) return null;
  const w = [...werte].sort((a, b) => a - b);
  const m = Math.floor(w.length / 2);
  return w.length % 2 ? w[m] : (w[m - 1] + w[m]) / 2;
}

/**
 * Klassische Van-Westendorp-Schnittpunkte über alle ganzen Euro-Beträge:
 *   optimal   „zu billig" (fallend)  ∩ „zu teuer" (steigend)
 *   untere    „zu billig" (fallend)  ∩ „nicht günstig" (steigend)
 *   obere     „zu teuer" (steigend)  ∩ „nicht teuer" (fallend)
 * `null`, solange es zu wenige Antworten gibt.
 */
export function vanWestendorp(antworten) {
  const n = antworten.length;
  if (n < 3) return null;
  const max = Math.ceil(Math.max(...antworten.map((e) => e.zuTeuer), 1));
  const anteil = (bedingung) => antworten.filter(bedingung).length / n;
  const schnitt = (f, g) => {
    let bester = 0;
    let abstand = Infinity;
    for (let p = 0; p <= max; p++) {
      const d = Math.abs(f(p) - g(p));
      if (d < abstand) {
        abstand = d;
        bester = p;
      }
    }
    return bester;
  };
  const zuBillig = (p) => anteil((e) => e.zuBillig >= p);
  const zuTeuer = (p) => anteil((e) => e.zuTeuer <= p);
  const nichtGuenstig = (p) => anteil((e) => e.guenstig < p);
  const nichtTeuer = (p) => anteil((e) => e.teuer > p);
  return {
    optimal: schnitt(zuBillig, zuTeuer),
    untereGrenze: schnitt(zuBillig, nichtGuenstig),
    obereGrenze: schnitt(zuTeuer, nichtTeuer),
  };
}

export async function webUmfrage(env) {
  if (!env.ALPHA)
    return hinweis("Der KV-Namespace ALPHA ist nicht verbunden, deshalb gibt es keine Umfrage-Antworten.");

  const liste = await env.ALPHA.list({ prefix: "umfrage:", limit: 500 });
  const eintraege = (
    await Promise.all(
      liste.keys.map(async (k) => {
        try {
          return JSON.parse((await env.ALPHA.get(k.name)) || "null");
        } catch (_) {
          return null;
        }
      })
    )
  ).filter(Boolean);
  eintraege.sort((a, b) => String(b.zeit).localeCompare(String(a.zeit)));

  const modelle = { einmalig: 0, jahresabo: 0, monatsabo: 0, egal: 0 };
  eintraege.forEach((e) => {
    if (e.modell in modelle) modelle[e.modell]++;
  });

  // Nur in sich stimmige Antworten (aufsteigende Preise) gehen in die Preisgrenzen ein.
  const stimmig = eintraege.filter((e) => e.stimmig);
  const monatlich = eintraege.map((e) => e.monatlich).filter((x) => typeof x === "number");

  return {
    ok: true,
    gesamt: eintraege.length,
    stimmig: stimmig.length,
    ausAlpha: eintraege.filter((e) => e.alphaTeilnehmer).length,
    median: {
      zuBillig: median(stimmig.map((e) => e.zuBillig)),
      guenstig: median(stimmig.map((e) => e.guenstig)),
      teuer: median(stimmig.map((e) => e.teuer)),
      zuTeuer: median(stimmig.map((e) => e.zuTeuer)),
      monatlich: median(monatlich),
    },
    preispunkte: vanWestendorp(stimmig),
    modelle,
    eintraege: eintraege.slice(0, 100),
  };
}


/** NPS aus 0–10-Werten: % Promotoren (9–10) − % Kritiker (0–6). */
export function nps(werte) {
  const w = werte.filter((x) => Number.isInteger(x));
  if (!w.length) return null;
  const pro = w.filter((x) => x >= 9).length;
  const kontra = w.filter((x) => x <= 6).length;
  return { wert: Math.round(((pro - kontra) / w.length) * 100), n: w.length, promotoren: pro, passive: w.length - pro - kontra, kritiker: kontra };
}

const VW = ["zuBillig", "guenstig", "teuer", "zuTeuer"];

const STOPP = new Set("der die das den dem des ein eine einen einem einer und oder aber ich du er sie es wir ihr mit für von zu zum zur im in an auf aus bei nach über um auch noch nur nicht kein keine ist sind war wäre hat haben hätte wird werden kann könnte soll sollte mehr sehr wie was wenn dass da so als bin habe mein meine mir mich dir dich man mal schon gut ganz viel viele etwas wäre würde".split(" "));

/** Häufige Wörter in Freitexten (ohne Füllwörter), für einen schnellen Überblick über Themen. */
export function stichworte(texte, n = 12) {
  const zaehler = {};
  for (const t of texte)
    for (const w of new Set(String(t).toLowerCase().match(/[a-zäöüß][a-zäöüß-]{3,}/g) || []))
      if (!STOPP.has(w)) zaehler[w] = (zaehler[w] || 0) + 1;
  return Object.entries(zaehler)
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([name, anzahl]) => ({ name, anzahl }));
}

const de = (x) => String(x).replace(".", ",");

/** Kernaussagen in einfachen Sätzen: was fällt auf (bester und schwächster Wert, NPS, häufigste Antwort). */
export function kernaussagen(fragen) {
  const aus = [];
  const n = fragen.find((f) => f.typ === "nps" && f.nps);
  if (n) {
    const w = n.nps.wert;
    aus.push(`Weiterempfehlung (NPS): ${w}. ${w >= 30 ? "Das ist stark." : w >= 0 ? "Das ist ausbaufähig." : "Mehr Kritiker als Promotoren, das ist das Wichtigste, was hier zu klären ist."} ${n.nps.promotoren} Promotoren, ${n.nps.passive} Passive, ${n.nps.kritiker} Kritiker.`);
  }
  const skalen = fragen.filter((f) => f.typ === "skala" && f.schnitt != null && f.n >= 3);
  if (skalen.length) {
    const s = [...skalen].sort((a, b) => a.schnitt - b.schnitt);
    aus.push(`Am schlechtesten bewertet: „${s[0].text}“ mit ${de(s[0].schnitt)} von 5.`);
    if (s.length > 1) aus.push(`Am besten bewertet: „${s.at(-1).text}“ mit ${de(s.at(-1).schnitt)} von 5.`);
  }
  for (const f of fragen.filter((x) => x.typ === "matrix")) {
    const z = (f.zeilen || []).filter((r) => r.schnitt != null && r.n >= 3).sort((a, b) => a.schnitt - b.schnitt);
    if (z.length > 1) aus.push(`${f.text}: schwächste Funktion „${z[0].name}“ (${de(z[0].schnitt)}), stärkste „${z.at(-1).name}“ (${de(z.at(-1).schnitt)}).`);
    const ungenutzt = [...(f.zeilen || [])].sort((a, b) => b.nichtGenutzt - a.nichtGenutzt)[0];
    if (ungenutzt?.nichtGenutzt >= 2) aus.push(`„${ungenutzt.name}“ nutzen ${ungenutzt.nichtGenutzt} Tester nicht.`);
  }
  for (const f of fragen.filter((x) => (x.typ === "einfach" || x.typ === "mehrfach") && x.n >= 3)) {
    const top = [...(f.verteilung || [])].sort((a, b) => b.anzahl - a.anzahl)[0];
    if (top && top.anzahl > 0) aus.push(`${f.text} Am häufigsten: „${top.name}“ (${Math.round((top.anzahl / f.n) * 100)} %).`);
    if (aus.length > 9) break;
  }
  return aus.slice(0, 10);
}

/** Wertet alle Antworten einer Umfrage je Frage aus. `eingeladen`: Zahl der Tester, die antworten könnten (für die Quote). */
export function werteAus(umfrage, antworten, { eingeladen = 0, version = "", system = "", von = "", bis = "" } = {}) {
  const alle = antworten.filter((a) => a.umfrage === umfrage.id);
  const versionen = {};
  const systeme = {};
  for (const a of alle) {
    if (a.version) versionen[a.version] = (versionen[a.version] || 0) + 1;
    if (a.system) systeme[a.system] = (systeme[a.system] || 0) + 1;
  }
  const liste = alle.filter(a=>(!version||a.version===version)&&(!system||a.system===system)&&(!von||a.zeit>=von)&&(!bis||a.zeit<bis));
  const fragen = (umfrage.fragen || []).map((f) => {
    const werte = liste.map((a) => a.antworten?.[f.id]).filter((v) => v !== undefined && v !== null && v !== "");
    const basis = { id: f.id, typ: f.typ, text: f.text, abschnitt: f.abschnitt || null, n: werte.length };
    switch (f.typ) {
      case "einfach":
      case "mehrfach": {
        const zaehler = Object.fromEntries((f.optionen || []).map((o) => [o, 0]));
        for (const v of werte) for (const o of Array.isArray(v) ? v : [v]) if (o in zaehler) zaehler[o]++;
        return { ...basis, verteilung: Object.entries(zaehler).map(([name, anzahl]) => ({ name, anzahl })) };
      }
      case "skala": {
        const zahlen = werte.map(Number).filter((x) => x >= 1 && x <= 5);
        const verteilung = [1, 2, 3, 4, 5].map((s) => ({ name: String(s), anzahl: zahlen.filter((x) => x === s).length }));
        return { ...basis, schnitt: zahlen.length ? +(zahlen.reduce((a, b) => a + b, 0) / zahlen.length).toFixed(2) : null, verteilung };
      }
      case "nps": {
        const zahlen = werte.map(Number);
        return { ...basis, nps: nps(zahlen), verteilung: [...Array(11)].map((_, s) => ({ name: String(s), anzahl: zahlen.filter((x) => x === s).length })) };
      }
      case "euro": {
        const zahlen = werte.map(Number).filter(Number.isFinite);
        return { ...basis, median: median(zahlen), min: zahlen.length ? Math.min(...zahlen) : null, max: zahlen.length ? Math.max(...zahlen) : null };
      }
      case "matrix": {
        const zeilen = (f.zeilen || []).map((z) => {
          const w = werte.map((v) => v?.[z]).filter((x) => x !== undefined);
          const zahlen = w.filter((x) => typeof x === "number");
          return {
            name: z,
            schnitt: zahlen.length ? +(zahlen.reduce((a, b) => a + b, 0) / zahlen.length).toFixed(2) : null,
            n: zahlen.length,
            verteilung: [1,2,3,4,5].map(n=>({name:String(n),anzahl:zahlen.filter(x=>x===n).length})),
            nichtGenutzt: w.filter((x) => x === "nicht genutzt").length,
          };
        });
        return { ...basis, zeilen };
      }
      case "text":
        return {
          ...basis,
          texte: liste
            .filter((a) => a.antworten?.[f.id])
            .slice(-300)
            .reverse()
            .map((a) => ({ text: String(a.antworten[f.id]), email: a.email || null, zeit: a.zeit, version: a.version || null })),
          stichworte: stichworte(liste.map((a) => a.antworten?.[f.id]).filter(Boolean)),
        };
      default:
        return basis;
    }
  });

  // Van Westendorp, wenn alle vier Preisfragen vorkommen.
  let preispunkte = null;
  const ids = new Set((umfrage.fragen || []).map((f) => f.id));
  if (VW.every((k) => ids.has(k))) {
    const stimmig = liste
      .map((a) => Object.fromEntries(VW.map((k) => [k, Number(a.antworten?.[k])])))
      .filter((e) => VW.every((k) => Number.isFinite(e[k])) && e.zuBillig <= e.guenstig && e.guenstig <= e.teuer && e.teuer <= e.zuTeuer);
    preispunkte = { n: stimmig.length, ...(vanWestendorp(stimmig) || {}), median: Object.fromEntries(VW.map((k) => [k, median(stimmig.map((e) => e[k]))])) };
  }

  const zeiten = liste.map((a) => a.zeit).sort();
  // Vollständigkeit: Anteil der beantworteten Fragen je Antwort (leere Freitexte zählen als offen).
  const gesamtFragen = (umfrage.fragen || []).length || 1;
  const beantwortet = liste.map((a) => (umfrage.fragen || []).filter((f) => {
    const v = a.antworten?.[f.id];
    return v !== undefined && v !== null && v !== "";
  }).length / gesamtFragen);
  const vollstaendig = beantwortet.length ? Math.round((beantwortet.reduce((x, y) => x + y, 0) / beantwortet.length) * 100) : null;
  const proTag = {};
  for (const z of zeiten) proTag[String(z).slice(0, 10)] = (proTag[String(z).slice(0, 10)] || 0) + 1;
  return {
    id: umfrage.id,
    titel: umfrage.titel,
    antworten: liste.length,
    gesamt: alle.length,
    version: version || null,
    quote: eingeladen ? { eingeladen, anteil: Math.min(100, Math.round((alle.length / eingeladen) * 100)) } : null,
    vollstaendig,
    erste: zeiten[0] || null,
    letzte: zeiten.at(-1) || null,
    verlauf: Object.entries(proTag).sort().map(([tag, wert]) => ({ tag, wert })),
    versionen: Object.entries(versionen).map(([name, anzahl]) => ({ name, anzahl })).sort((a, b) => b.anzahl - a.anzahl),
    systeme: Object.entries(systeme).map(([name, anzahl]) => ({ name, anzahl })).sort((a, b) => b.anzahl - a.anzahl),
    einzelantworten: liste.map(({_key,...r})=>r),
    kernaussagen: liste.length>=20?kernaussagen(fragen):[],
    fragen,
    preispunkte,
  };
}

/** CSV aller Antworten einer Umfrage (Semikolon, für Excel). */
export function csv(umfrage, antworten) {
  const liste = antworten.filter((a) => a.umfrage === umfrage.id);
  const fragen = umfrage.fragen || [];
  const spalten = fragen.map((f) => f.id);
  // Spaltenköpfe sind die Fragetexte (lesbar in Excel); bei doppelten Texten hängt die ID an.
  const kopf = fragen.map((f, i) => (fragen.findIndex((g) => g.text === f.text) === i ? f.text : `${f.text} (${f.id})`));
  const zelle = (v) => {
    const t = v === undefined || v === null ? "" : Array.isArray(v) ? v.join(", ") : typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[;"\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  const zeilen = [["zeit", "email", "version", "system", ...kopf].map(zelle).join(";")];
  for (const a of liste) zeilen.push([a.zeit, a.email, a.version, a.system, ...spalten.map((s) => a.antworten?.[s])].map(zelle).join(";"));
  return "\ufeff" + zeilen.join("\n");
}
