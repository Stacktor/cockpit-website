/**
 * GET /api/admin/doku[?pfad=…] — interne Doku aus einem privaten GitHub-Repo
 * (Einstellung DOCS_REPO, Standard Stacktor/cockpit-docs). Nur lesend.
 *
 * Ohne Pfad: alle Markdown-Dateien des Repos. Mit Pfad: die Datei, von GitHub
 * als HTML gerendert (GitHub entfernt Skripte; der Browser säubert zusätzlich
 * per Allowlist, siehe src/scripts/admin/bereiche.ts → saeubern).
 * Braucht GITHUB_TOKEN mit Lesezugriff (Contents) auf das Doku-Repo.
 */
import { json } from "../../../lib/admin/zugang.js";
import { fehler, hinweis, sicher } from "../../../lib/admin/daten.js";

export const STANDARD_REPO = "Stacktor/cockpit-docs";
const REPO_RE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
// Relative .md-Pfade ohne „..", ohne führenden Schrägstrich.
const PFAD_RE = /^(?!\/)(?!.*\.\.)[\p{L}\p{N} _.()\/-]+\.md$/iu;
const MAX_HTML = 1_500_000;

function gh(env, pfad, accept) {
  return fetch(`https://api.github.com/${pfad}`, {
    headers: { Accept: accept, "User-Agent": "cockpit-admin", Authorization: `Bearer ${env.GITHUB_TOKEN}` },
  });
}

const reihenfolge = (a, b) => {
  const rang = (p) => (/^readme\.md$/i.test(p) ? 0 : p.includes("/") ? 2 : 1);
  return rang(a.pfad) - rang(b.pfad) || a.pfad.localeCompare(b.pfad, "de");
};

export async function onRequestGet({ request, data }) {
  const env = data.env;
  const repo = String(env.DOCS_REPO || STANDARD_REPO).trim();
  if (!REPO_RE.test(repo)) return json(200, hinweis("Das Doku-Repo ist ungültig (Form: besitzer/name)."));
  if (!env.GITHUB_TOKEN)
    return json(200, { ...hinweis(`Für die Doku braucht es einen GitHub-Token mit Lesezugriff (Contents) auf ${repo}.`), repo });

  const pfad = new URL(request.url).searchParams.get("pfad");
  const antwort = await sicher(async () => {
    if (!pfad) {
      const r = await gh(env, `repos/${repo}/git/trees/HEAD?recursive=1`, "application/vnd.github+json");
      if (r.status === 404 || r.status === 403)
        return { ...hinweis(`${repo} ist nicht erreichbar — gibt es das Repo, und darf der GitHub-Token es lesen?`), repo };
      if (r.status === 409) return { ok: true, repo, dateien: [] }; // Repo ohne Commit
      if (!r.ok) return fehler(`GitHub antwortete mit ${r.status}.`);
      const d = await r.json();
      const dateien = (d.tree || [])
        .filter((e) => e.type === "blob" && /\.md$/i.test(e.path) && PFAD_RE.test(e.path))
        .map((e) => ({ pfad: e.path, groesse: e.size }))
        .sort(reihenfolge);
      return { ok: true, repo, dateien, gekuerzt: Boolean(d.truncated) };
    }
    if (!PFAD_RE.test(pfad)) return hinweis("Ungültiger Pfad.");
    const kodiert = pfad.split("/").map(encodeURIComponent).join("/");
    const r = await gh(env, `repos/${repo}/contents/${kodiert}`, "application/vnd.github.html+json");
    if (r.status === 404) return hinweis("Datei nicht gefunden.");
    if (!r.ok) return fehler(`GitHub antwortete mit ${r.status}.`);
    const html = await r.text();
    return { ok: true, repo, pfad, html: html.slice(0, MAX_HTML), url: `https://github.com/${repo}/blob/HEAD/${kodiert}` };
  });
  return json(200, antwort);
}
