/**
 * GET /api/admin/builds — Downloads, Releases, Actions-Läufe und Issues (GitHub).
 * GITHUB_TOKEN ist optional (sonst 60 Abrufe/Stunde und nur öffentliche Repos).
 */
import { json } from "../../../lib/admin/zugang.js";
import { github, hinweis, sicher } from "../../../lib/admin/daten.js";

const APP = "Stacktor/Bewerbungs-Cockpit";
const DL = "Stacktor/cockpit-releases";

export async function onRequestGet({ data }) {
  const env = data.env;
  const [releases, laeufe, issues, entwuerfe] = await Promise.all([
    sicher(async () => {
      const r = await github(env, `repos/${DL}/releases?per_page=20`);
      if (!r.ok) return hinweis(`GitHub (${DL}): ${r.status}`);
      return {
        ok: true,
        liste: (r.daten || []).map((rel) => ({
          tag: rel.tag_name,
          name: rel.name,
          datum: rel.published_at,
          url: rel.html_url,
          dateien: (rel.assets || []).map((a) => ({ name: a.name, downloads: a.download_count, groesse: a.size })),
          downloads: (rel.assets || []).reduce((s, a) => s + (a.download_count || 0), 0),
        })),
      };
    }),
    sicher(async () => {
      const r = await github(env, `repos/${APP}/actions/runs?per_page=15`);
      if (!r.ok) return hinweis(r.status === 404 ? "Actions nicht lesbar. Für ein privates Repo einen GitHub-Token eintragen." : `GitHub: ${r.status}`);
      return {
        ok: true,
        liste: (r.daten?.workflow_runs || []).map((l) => ({
          name: l.name,
          titel: l.display_title,
          status: l.status,
          ergebnis: l.conclusion,
          zweig: l.head_branch,
          ereignis: l.event,
          zeit: l.created_at,
          url: l.html_url,
        })),
      };
    }),
    sicher(async () => {
      const r = await github(env, `repos/${APP}/issues?state=open&per_page=15`);
      if (!r.ok) return hinweis(`GitHub: ${r.status}`);
      const liste = (r.daten || []).filter((i) => !i.pull_request);
      return { ok: true, liste: liste.map((i) => ({ nummer: i.number, titel: i.title, zeit: i.created_at, url: i.html_url, labels: (i.labels || []).map((l) => l.name) })) };
    }),
    sicher(async () => {
      if (!env.GITHUB_TOKEN) return hinweis("Testbuild-Entwürfe sind nur mit GitHub-Token sichtbar.");
      const r = await github(env, `repos/${APP}/releases?per_page=10`);
      if (!r.ok) return hinweis(`GitHub: ${r.status}`);
      return { ok: true, liste: (r.daten || []).filter((x) => x.draft).map((x) => ({ tag: x.tag_name, name: x.name, url: x.html_url, zeit: x.created_at })) };
    }),
  ]);
  return json(200, { releases, laeufe, issues, entwuerfe });
}
