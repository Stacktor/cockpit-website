/**
 * /api/admin/umfragen — Fragebögen bearbeiten und auswerten.
 *   GET                 Definitionen + Auswertung je Umfrage + beendete Web-Umfrage
 *   GET ?export=<id>    alle Antworten als CSV
 *   POST { aktion: "speichern", umfrage } | { aktion: "aktiv", id, aktiv } | { aktion: "loeschen", id }
 *
 * Solange im KV keine eigene Definition liegt, gelten die Standard-Fragebögen.
 * Beim ersten Speichern werden sie mit ins KV übernommen, damit keiner verschwindet.
 */
import { json } from "../../../lib/admin/zugang.js";
import { alleSchluessel, antworten } from "../../../lib/admin/daten.js";
import { csv, webUmfrage, werteAus } from "../../../lib/admin/auswertung.js";
import { protokolliere } from "../../../lib/admin/protokoll.js";
import { STANDARD_UMFRAGEN, ladeUmfragen, pruefeDefinition } from "../../../lib/umfragen.js";

export async function onRequestGet({ request, data }) {
  const env = data.env;
  if (!env.ALPHA) return json(503, { fehler: "KV-Namespace ALPHA ist nicht verbunden." });
  const eigene = (await alleSchluessel(env, "survey:def:")).length > 0;
  const umfragen = await ladeUmfragen(env, { nurAktive: false });
  const alle = await antworten(env);

  const exportId = new URL(request.url).searchParams.get("export");
  if (exportId) {
    const u = umfragen.find((x) => x.id === exportId);
    if (!u) return json(404, { fehler: "Umfrage nicht gefunden." });
    return new Response(csv(u, alle), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="umfrage-${u.id}.csv"`,
        "cache-control": "no-store",
      },
    });
  }

  return json(200, {
    standard: !eigene,
    umfragen: umfragen.map((u) => ({ definition: u, auswertung: werteAus(u, alle) })),
    web: await webUmfrage(env).catch(() => null),
  });
}

export async function onRequestPost({ request, data }) {
  const env = data.env;
  if (!env.ALPHA) return json(503, { fehler: "KV-Namespace ALPHA ist nicht verbunden." });
  const d = await request.json().catch(() => null);
  const eigene = (await alleSchluessel(env, "survey:def:")).length > 0;
  const uebernimmStandard = async () => {
    if (eigene) return;
    for (const s of STANDARD_UMFRAGEN) await env.ALPHA.put(`survey:def:${s.id}`, JSON.stringify(s));
  };

  switch (d?.aktion) {
    case "speichern": {
      const { umfrage, fehler } = pruefeDefinition(d.umfrage);
      if (fehler) return json(422, { fehler });
      await uebernimmStandard();
      await env.ALPHA.put(`survey:def:${umfrage.id}`, JSON.stringify({ ...umfrage, geaendert: new Date().toISOString() }));
      await protokolliere(env, data.benutzer, "Umfrage gespeichert", umfrage.id);
      return json(200, { ok: true, meldung: `„${umfrage.titel}“ gespeichert.` });
    }
    case "aktiv": {
      await uebernimmStandard();
      const key = `survey:def:${String(d.id || "")}`;
      const roh = await env.ALPHA.get(key);
      if (!roh) return json(404, { fehler: "Umfrage nicht gefunden." });
      const u = JSON.parse(roh);
      u.aktiv = Boolean(d.aktiv);
      await env.ALPHA.put(key, JSON.stringify(u));
      await protokolliere(env, data.benutzer, u.aktiv ? "Umfrage aktiviert" : "Umfrage pausiert", u.id);
      return json(200, { ok: true, meldung: u.aktiv ? "Umfrage ist aktiv." : "Umfrage pausiert." });
    }
    case "loeschen": {
      await uebernimmStandard();
      const key = `survey:def:${String(d.id || "")}`;
      if (!(await env.ALPHA.get(key))) return json(404, { fehler: "Umfrage nicht gefunden." });
      await env.ALPHA.delete(key);
      const rest = (await alleSchluessel(env, "survey:def:")).length;
      await protokolliere(env, data.benutzer, "Umfrage gelöscht", String(d.id));
      return json(200, {
        ok: true,
        meldung: rest ? "Umfrage gelöscht. Antworten bleiben erhalten." : "Gelöscht — ohne eigene Umfragen gelten wieder die Standard-Fragebögen.",
      });
    }
    default:
      return json(400, { fehler: "Unbekannte Aktion." });
  }
}
