/**
 * GET /api/admin/patchnotes — Version und Patchnotes der App aus den Releases von Stacktor/cockpit-releases.
 * Dev-Builds (`dev-…`, `dev-mac-…`) und echte Releases stehen zusammen; die Notizen sind die Zeilen des Release-Textes.
 */
import { json } from "../../../lib/admin/zugang.js";
import { github, hinweis, sicher } from "../../../lib/admin/daten.js";

const DL = "Stacktor/cockpit-releases";

/** Version aus Tag oder Name („dev-mac-0.1.0-43“, „v0.1.0“, „cockpit v0.1.0 (Alpha)“). */
export function versionAus(rel) {
  const m = `${rel.tag_name || ""} ${rel.name || ""}`.match(/(\d+\.\d+\.\d+(?:-\d+)?)/);
  return m ? m[1] : String(rel.tag_name || "");
}

export function kanalAus(rel) {
  const tag = String(rel.tag_name || "");
  if (tag.startsWith("dev-mac")) return "Dev Mac";
  if (tag.startsWith("dev")) return "Dev Windows";
  return rel.prerelease ? "Vorabversion" : "Release";
}

/** Notizen: Aufzählungszeilen des Release-Textes; ohne Aufzählung die ersten Zeilen. */
export function notizenAus(body) {
  const zeilen = String(body || "").split(/\r?\n/).map((z) => z.trim()).filter(Boolean);
  const punkte = zeilen.filter((z) => /^[-*•]\s+/.test(z)).map((z) => z.replace(/^[-*•]\s+/, ""));
  return (punkte.length ? punkte : zeilen.filter((z) => !z.startsWith("#"))).slice(0, 14).map((z) => z.slice(0, 220));
}

export async function onRequestGet({ data }) {
  const env = data.env;
  const antwort = await sicher(async () => {
    const r = await github(env, `repos/${DL}/releases?per_page=14`);
    if (!r.ok) return hinweis(`GitHub (${DL}): ${r.status}`);
    const liste = (r.daten || [])
      .filter((x) => !x.draft)
      .map((x) => ({
        tag: x.tag_name,
        version: versionAus(x),
        kanal: kanalAus(x),
        datum: x.published_at,
        url: x.html_url,
        notizen: notizenAus(x.body),
      }));
    const stabil = liste.find((x) => x.kanal === "Release") || null;
    return { ok: true, neueste: liste[0] || null, stabil, liste };
  });
  return json(200, antwort);
}
