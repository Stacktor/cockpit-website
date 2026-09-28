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
    return hinweis("KV-Namespace ALPHA nicht verbunden — keine Umfrage-Antworten.");

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

/** Wertet alle Antworten einer Umfrage je Frage aus. */
export function werteAus(umfrage, antworten) {
  const liste = antworten.filter((a) => a.umfrage === umfrage.id);
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
            .slice(-100)
            .reverse()
            .map((a) => ({ text: String(a.antworten[f.id]), email: a.email || null, zeit: a.zeit })),
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
  return { id: umfrage.id, titel: umfrage.titel, antworten: liste.length, erste: zeiten[0] || null, letzte: zeiten.at(-1) || null, fragen, preispunkte };
}

/** CSV aller Antworten einer Umfrage (Semikolon, für Excel). */
export function csv(umfrage, antworten) {
  const liste = antworten.filter((a) => a.umfrage === umfrage.id);
  const spalten = (umfrage.fragen || []).map((f) => f.id);
  const zelle = (v) => {
    const t = v === undefined || v === null ? "" : Array.isArray(v) ? v.join(", ") : typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[;"\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  const zeilen = [["zeit", "email", "version", "system", ...spalten].join(";")];
  for (const a of liste) zeilen.push([a.zeit, a.email, a.version, a.system, ...spalten.map((s) => a.antworten?.[s])].map(zelle).join(";"));
  return "\ufeff" + zeilen.join("\n");
}
