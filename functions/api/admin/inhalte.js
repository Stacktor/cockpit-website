/**
 * Inhalte der Website bearbeiten: Blog, Hilfe, Funktionen und Roadmap liegen
 * als Markdown in src/content/<sammlung>/ dieses Repos. Der Editor im Admin
 * liest und schreibt sie über die GitHub-API; jeder Speichervorgang ist ein
 * Commit auf den Haupt-Branch, danach baut Cloudflare Pages die Seite neu.
 *
 * GET  /api/admin/inhalte              → Dateien je Sammlung
 * GET  /api/admin/inhalte?pfad=…       → Rohtext und SHA einer Datei
 * POST /api/admin/inhalte {pfad, inhalt, sha?} → Commit (sha fehlt = neue Datei)
 *
 * Braucht GITHUB_INHALT_TOKEN (Fine-grained, „Contents: Read and write“ nur für
 * das Website-Repo). Ohne ihn wird GITHUB_TOKEN versucht; reicht dessen Recht
 * nicht, meldet GitHub 403 und der Editor sagt das.
 */
import { json } from "../../../lib/admin/zugang.js";
import { fehler, hinweis, sicher } from "../../../lib/admin/daten.js";
import { protokolliere } from "../../../lib/admin/protokoll.js";

export const STANDARD_REPO = "Stacktor/cockpit-website";
export const SAMMLUNGEN = ["blog", "hilfe", "funktionen", "roadmap"];
const REPO_RE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const BRANCH_RE = /^[A-Za-z0-9._\/-]{1,100}$/;
/** Nur Markdown direkt in einer der Sammlungen, Dateiname in Kleinbuchstaben. */
export const PFAD_RE = new RegExp(`^src/content/(${SAMMLUNGEN.join("|")})/[a-z0-9][a-z0-9-]{0,80}\\.md$`);
export const MAX_BYTES = 200_000;

const token = (env) => env.GITHUB_INHALT_TOKEN || env.GITHUB_TOKEN || "";

function gh(env, pfad, init = {}) {
  return fetch(`https://api.github.com/${pfad}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "cockpit-admin",
      "X-GitHub-Api-Version": "2022-11-28",
      Authorization: `Bearer ${token(env)}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
  });
}

export function base64NachText(b64) {
  const bin = atob(String(b64).replace(/\s/g, ""));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function textNachBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

function ziel(env) {
  const repo = String(env.SITE_REPO || STANDARD_REPO).trim();
  const branch = String(env.SITE_BRANCH || "main").trim();
  if (!REPO_RE.test(repo)) return { fehler: "Das Website-Repo ist ungültig (Form: besitzer/name)." };
  if (!BRANCH_RE.test(branch) || branch.includes("..")) return { fehler: "Der Branch ist ungültig." };
  return { repo, branch };
}

const kodiere = (pfad) => pfad.split("/").map(encodeURIComponent).join("/");

export async function onRequestGet({ request, data }) {
  const env = data.env;
  const z = ziel(env);
  if (z.fehler) return json(200, hinweis(z.fehler));
  if (!token(env))
    return json(200, {
      ...hinweis(`Für den Editor braucht es einen GitHub-Token mit „Contents: Read and write“ auf ${z.repo}.`),
      repo: z.repo,
    });

  const pfad = new URL(request.url).searchParams.get("pfad");
  const antwort = await sicher(async () => {
    if (!pfad) {
      const r = await gh(env, `repos/${z.repo}/git/trees/${encodeURIComponent(z.branch)}?recursive=1`);
      if (r.status === 404 || r.status === 403)
        return { ...hinweis(`${z.repo} ist nicht erreichbar. Prüf, ob der Token das Repo lesen darf.`), repo: z.repo };
      if (!r.ok) return fehler(`GitHub antwortete mit ${r.status}.`);
      const d = await r.json();
      const dateien = (d.tree || []).filter((e) => e.type === "blob" && PFAD_RE.test(e.path));
      const sammlungen = SAMMLUNGEN.map((id) => ({
        id,
        dateien: dateien
          .filter((e) => e.path.startsWith(`src/content/${id}/`))
          .map((e) => ({ pfad: e.path, groesse: e.size }))
          .sort((a, b) => a.pfad.localeCompare(b.pfad, "de")),
      }));
      return { ok: true, repo: z.repo, branch: z.branch, sammlungen };
    }
    if (!PFAD_RE.test(pfad)) return hinweis("Ungültiger Pfad.");
    const r = await gh(env, `repos/${z.repo}/contents/${kodiere(pfad)}?ref=${encodeURIComponent(z.branch)}`);
    if (r.status === 404) return hinweis("Datei nicht gefunden.");
    if (!r.ok) return fehler(`GitHub antwortete mit ${r.status}.`);
    const d = await r.json();
    if (d.type !== "file" || typeof d.content !== "string") return hinweis("Das ist keine Datei.");
    return {
      ok: true,
      pfad,
      sha: d.sha,
      inhalt: base64NachText(d.content),
      url: `https://github.com/${z.repo}/blob/${z.branch}/${kodiere(pfad)}`,
    };
  });
  return json(200, antwort);
}

export function pruefeSpeichern(d) {
  if (!d || typeof d !== "object") return "Ungültige Anfrage.";
  if (typeof d.pfad !== "string" || !PFAD_RE.test(d.pfad)) return "Ungültiger Pfad.";
  if (typeof d.inhalt !== "string" || !d.inhalt.trim()) return "Der Inhalt ist leer.";
  if (new TextEncoder().encode(d.inhalt).length > MAX_BYTES) return "Der Text ist zu lang (höchstens 200 KB).";
  if (!/^---\r?\n[\s\S]*?\r?\n---\r?\n/.test(d.inhalt)) return "Der Kopfbereich (zwischen ---) fehlt.";
  if (d.sha !== undefined && d.sha !== null && !/^[0-9a-f]{40}$/.test(String(d.sha))) return "Ungültige Versionskennung.";
  return null;
}

export async function onRequestPost({ request, data }) {
  const env = data.env;
  const z = ziel(env);
  if (z.fehler) return json(400, { fehler: z.fehler });
  if (!token(env)) return json(400, { fehler: "Kein GitHub-Token hinterlegt." });

  const d = await request.json().catch(() => null);
  const falsch = pruefeSpeichern(d);
  if (falsch) return json(400, { fehler: falsch });

  const neu = !d.sha;
  const datei = d.pfad.split("/").pop();
  const sammlung = d.pfad.split("/")[2];
  const r = await gh(env, `repos/${z.repo}/contents/${kodiere(d.pfad)}`, {
    method: "PUT",
    body: JSON.stringify({
      message: `inhalt(${sammlung}): ${datei} ${neu ? "angelegt" : "bearbeitet"} (Admin)`,
      content: textNachBase64(d.inhalt.replace(/\r\n/g, "\n")),
      branch: z.branch,
      ...(neu ? {} : { sha: d.sha }),
    }),
  });
  if (r.status === 409 || (r.status === 422 && !neu))
    return json(409, { fehler: "Die Datei wurde inzwischen an anderer Stelle geändert. Lade sie neu und übernimm deine Änderungen." });
  if (r.status === 422 && neu) return json(409, { fehler: "Eine Datei mit diesem Namen gibt es schon." });
  if (r.status === 403 || r.status === 404)
    return json(403, { fehler: "GitHub lehnt das Schreiben ab. Der Token braucht „Contents: Read and write“ für das Website-Repo." });
  if (!r.ok) return json(502, { fehler: `GitHub antwortete mit ${r.status}.` });
  const erg = await r.json();
  await protokolliere(env, data.benutzer, neu ? "Inhalt angelegt" : "Inhalt gespeichert", d.pfad);
  return json(200, {
    ok: true,
    sha: erg.content?.sha,
    commit: erg.commit?.html_url,
    meldung: "Gespeichert. Die Website baut in etwa einer Minute neu.",
  });
}
