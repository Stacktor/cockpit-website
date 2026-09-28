/**
 * /api/admin/einstellungen — Schlüssel, Einstellungen, Plätze, Audit-Log.
 *   GET
 *   POST { aktion: "geheim", name, wert } | { aktion: "geheim-loeschen", name } | { aktion: "geheim-testen", name }
 *        { aktion: "einstellung", name, wert }
 */
import { json } from "../../../lib/admin/zugang.js";
import { leseProtokoll, protokolliere } from "../../../lib/admin/protokoll.js";
import { loescheGeheim, setzeEinstellung, setzeGeheim, status, testeGeheim } from "../../../lib/admin/tresor.js";
import { plaetze } from "../../../lib/alpha-optionen.js";

export async function onRequestGet({ env, data }) {
  // Tresor-Status braucht die rohe env (nicht die bereits aufgelöste).
  return json(200, {
    tresor: await status(env),
    plaetze: await plaetze(data.env),
    schutz: {
      access: Boolean(env.ACCESS_TEAM_DOMAIN && env.ACCESS_AUD),
      token: Boolean(env.ADMIN_TOKEN),
      kv: Boolean(env.ALPHA),
      master: Boolean(env.ADMIN_MASTER_KEY && String(env.ADMIN_MASTER_KEY).length >= 16),
      masterZuKurz: Boolean(env.ADMIN_MASTER_KEY && String(env.ADMIN_MASTER_KEY).length < 16),
    },
    benutzer: data.benutzer,
    protokoll: await leseProtokoll(env, 100),
  });
}

export async function onRequestPost({ request, env, data }) {
  const d = await request.json().catch(() => null);
  const name = String(d?.name || "");
  try {
    switch (d?.aktion) {
      case "geheim":
        await setzeGeheim(env, name, d.wert, data.benutzer);
        await protokolliere(env, data.benutzer, "Schlüssel gesetzt", name);
        return json(200, { ok: true, meldung: "Gespeichert (verschlüsselt).", test: await testeGeheim(env, name) });
      case "geheim-loeschen":
        await loescheGeheim(env, name);
        await protokolliere(env, data.benutzer, "Schlüssel entfernt", name);
        return json(200, { ok: true, meldung: "Entfernt. Falls eine Umgebungsvariable existiert, gilt jetzt wieder diese." });
      case "geheim-testen":
        return json(200, { ok: true, test: await testeGeheim(env, name) });
      case "einstellung":
        await setzeEinstellung(env, name, d.wert, data.benutzer);
        await protokolliere(env, data.benutzer, "Einstellung geändert", name);
        return json(200, { ok: true, meldung: "Gespeichert." });
      default:
        return json(400, { fehler: "Unbekannte Aktion." });
    }
  } catch (e) {
    return json(422, { fehler: String(e?.message || e) });
  }
}
