/**
 * Schlüssel-Tresor fürs Admin-Portal.
 *
 * API-Schlüssel (Polar, Lemon Squeezy, Resend, Cloudflare, GitHub) lassen sich im
 * Dashboard eintragen, tauschen und testen. Sie liegen AES-GCM-verschlüsselt im
 * KV (ein Eintrag „tresor:v1“); der Schlüssel dazu ist das Secret
 * ADMIN_MASTER_KEY, das nur im Pages-Projekt steht. Der Browser sieht nie mehr
 * als „gesetzt ••••1234“.
 *
 * Alle Functions lesen über `mitSchluesseln(env)`: erst Tresor, dann die
 * Umgebungsvariable gleichen Namens — bestehende Secrets laufen also weiter.
 * Nicht geheime Einstellungen (IDs, Links) liegen im selben Eintrag unverschlüsselt.
 */

export const GEHEIM = [
  {name:"GITHUB_RELEASE_TOKEN",titel:"App-Freigaben",hilfe:"Separater Fine-grained GitHub-Token nur für Bewerbungs-Cockpit: Actions lesen/schreiben, Contents und Pull requests lesen, Metadata lesen. Startet ausschließlich Test- und Alpha-Workflows. Kein Zugriff auf andere Repos; keine Konto- oder Zahlungsrechte."},
  {name:"KEYGEN_PRODUCT_TOKEN", titel:"Keygen (Alpha)", hilfe:"Produkttoken nur für cockpit: license.create/read/update/suspend/reinstate/validate/delete, machine.read/delete, policy.read und product.read. Kein Admin-Token."},
  {
    name: "POLAR_ACCESS_TOKEN",
    titel: "Polar",
    hilfe: "polar.sh (oder sandbox.polar.sh) → Settings → Developers → New Token, alle Rechte für Produkte, Bestellungen, Kunden, Rabatte und Lizenzschlüssel. Für Lizenzen, Geräte, Bestellungen, Rabattcodes.",
  },
  {
    name: "LEMONSQUEEZY_API_KEY",
    titel: "Lemon Squeezy (alt)",
    hilfe: "Nur noch für ältere Lizenzen ohne COCKPIT-Präfix. Lemon Squeezy → Settings → API → „+“.",
  },
  {
    name: "RESEND_API_KEY",
    titel: "Resend",
    hilfe: "resend.com → API Keys. „Full access“, damit Statistik und Kontaktlisten funktionieren.",
  },
  {
    name: "CF_ANALYTICS_TOKEN",
    titel: "Cloudflare Analytics",
    hilfe: "Cloudflare → My Profile → API Tokens → Vorlage „Read analytics and logs“ (Konto + Zone mesco.cc).",
  },
  {
    name: "GITHUB_TOKEN",
    titel: "GitHub",
    hilfe: "Fine-grained Token, nur Lesen (Actions, Contents, Issues) für Bewerbungs-Cockpit, cockpit-releases und das Doku-Repo. Ohne Token gibt es keine Doku, Builds nur eingeschränkt (60 Abrufe je Stunde).",
  },
  {
    name: "GITHUB_INHALT_TOKEN",
    titel: "GitHub (Inhalte bearbeiten)",
    hilfe: "Fine-grained Token mit „Contents: Read and write“ nur für cockpit-website. Damit speichert der Inhalte-Editor Blog- und Hilfe-Artikel als Commit. Ohne ihn bleibt der Editor schreibgeschützt.",
  },
];

export const EINSTELLUNGEN = [
  {name:"KEYGEN_ACCOUNT_ID",titel:"Keygen-Konto-ID",hilfe:"Öffentliche Konto-ID aus dem Keygen-Portal."},
  {name:"KEYGEN_PRODUCT_ID",titel:"Keygen-Produkt-ID",hilfe:"Produkt cockpit."},
  {name:"KEYGEN_ALPHA_POLICY_ID",titel:"Keygen-Alpha-Policy-ID",hilfe:"Policy cockpit Alpha, drei Geräte."},
  {name:"ALPHA_DOWNLOAD_URL",titel:"Alpha-Downloads",hilfe:"HTTPS-Link zu den signierten Installern. Erst nach Veröffentlichung eines Builds mit Lizenzpflicht freigeben."},
  { name: "POLAR_SERVER", titel: "Polar-Umgebung", hilfe: "„sandbox“ für Test-Zahlungen (sandbox.polar.sh), sonst leer oder „production“." },
  { name: "POLAR_ORG_ID", titel: "Polar-Organisations-ID", hilfe: "Polar → Settings → General → Organization ID." },
  { name: "POLAR_ALPHA_BENEFIT_ID", titel: "Benefit-ID der Alpha-Schlüssel", hilfe: "Polar → Products → Benefits → „Cockpit Alpha“ (ID). Mehrere mit Komma." },
  { name: "POLAR_ALPHA_PRODUCT_ID", titel: "Produkt-ID der Alpha", hilfe: "Polar → Products → „cockpit Alpha“ (ID). Für Einladungs-Rabattcodes." },
  { name: "POLAR_ALPHA_CHECKOUT_URL", titel: "Checkout-Link der Alpha", hilfe: "Polar → Products → „cockpit Alpha“ → Checkout Link (https://…polar.sh/checkout/…)." },
  { name: "CF_ACCOUNT_ID", titel: "Cloudflare-Konto-ID", hilfe: "Cloudflare → rechte Seitenleiste „Account ID“." },
  { name: "CF_ZONE_ID", titel: "Cloudflare-Zonen-ID (mesco.cc)", hilfe: "Cloudflare → mesco.cc → Übersicht → „Zone ID“." },
  { name: "LS_STORE_ID", titel: "Lemon-Squeezy-Store-ID", hilfe: "Lemon Squeezy → Settings → Stores (Zahl in der Adresse)." },
  { name: "LS_ALPHA_VARIANT_ID", titel: "Variant-ID der Alpha", hilfe: "Produkt → Variante „Alpha“ öffnen; die Zahl steht in der Adresse." },
  { name: "LS_ALPHA_CHECKOUT_URL", titel: "Checkout-Link der Alpha-Variante", hilfe: "Variante → „Share“ → Checkout-Link (https://…lemonsqueezy.com/checkout/buy/…)." },
  { name: "DISCORD_URL", titel: "Discord-Einladungslink", hilfe: "Erscheint in Bestätigungs- und Einladungsmails." },
  { name: "MAIL_VON", titel: "Absender der Mails", hilfe: "z. B. Bewerbungs-Cockpit <alpha@mesco.cc>. Die Domain muss in Resend bestätigt sein." },
  { name: "MAIL_AN", titel: "Empfänger von Benachrichtigungen", hilfe: "Deine Adresse für neue Anmeldungen und Fehlerberichte." },
  { name: "DOCS_REPO", titel: "Doku-Repo (privat)", hilfe: "besitzer/name des privaten Repos mit der internen Doku. Standard: Stacktor/cockpit-docs." },
  { name: "SITE_REPO", titel: "Website-Repo", hilfe: "besitzer/name des Repos dieser Website, für den Inhalte-Editor. Standard: Stacktor/cockpit-website." },
];

const KV_KEY = "tresor:v1";
const CACHE_MS = 60_000;
let cache = null; // { zeit, daten }

const b64 = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)));
const unb64 = (text) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

async function aesSchluessel(env) {
  if (!env.ADMIN_MASTER_KEY || String(env.ADMIN_MASTER_KEY).length < 16) return null;
  const roh = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(env.ADMIN_MASTER_KEY)));
  return crypto.subtle.importKey("raw", roh, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function verschluesseln(env, klartext) {
  const k = await aesSchluessel(env);
  if (!k) {
    throw new Error(
      env.ADMIN_MASTER_KEY
        ? "ADMIN_MASTER_KEY ist zu kurz (mindestens 16 Zeichen). Ohne gültigen Master-Schlüssel lassen sich keine Schlüssel speichern."
        : "ADMIN_MASTER_KEY fehlt (mindestens 16 Zeichen). Ohne ihn lassen sich keine Schlüssel speichern.",
    );
  }
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, k, new TextEncoder().encode(klartext));
  return { iv: b64(iv), ct: b64(ct) };
}

async function entschluesseln(env, eintrag) {
  const k = await aesSchluessel(env);
  if (!k || !eintrag?.iv || !eintrag?.ct) return null;
  try {
    const klar = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(eintrag.iv) }, k, unb64(eintrag.ct));
    return new TextDecoder().decode(klar);
  } catch {
    return null; // falscher Master-Schlüssel oder beschädigt
  }
}

async function lade(env, frisch = false) {
  if (!env.ALPHA) return { geheim: {}, einstellungen: {} };
  if (!frisch && cache && Date.now() - cache.zeit < CACHE_MS) return cache.daten;
  let daten = { geheim: {}, einstellungen: {} };
  try {
    daten = { ...daten, ...(JSON.parse((await env.ALPHA.get(KV_KEY)) || "null") || {}) };
  } catch {
    /* leer lassen */
  }
  cache = { zeit: Date.now(), daten };
  return daten;
}

async function speichere(env, daten) {
  await env.ALPHA.put(KV_KEY, JSON.stringify(daten));
  cache = { zeit: Date.now(), daten };
}

/** env-Kopie, in der Tresor-Werte Vorrang vor Umgebungsvariablen haben. */
export async function mitSchluesseln(env) {
  const daten = await lade(env);
  const neu = { ...env };
  for (const { name } of EINSTELLUNGEN) {
    const w = daten.einstellungen[name]?.wert;
    if (w) neu[name] = w;
  }
  for (const { name } of GEHEIM) {
    const e = daten.geheim[name];
    if (!e) continue;
    const klar = await entschluesseln(env, e);
    if (klar) neu[name] = klar;
  }
  return neu;
}

/** Übersicht für das Dashboard — ohne Klartext geheimer Werte. */
export async function status(env) {
  const daten = await lade(env, true);
  const masterOk = Boolean(await aesSchluessel(env));
  const geheim = [];
  for (const g of GEHEIM) {
    const e = daten.geheim[g.name];
    const lesbar = e ? Boolean(await entschluesseln(env, e)) : false;
    const quelle = e && lesbar ? "dashboard" : env[g.name] ? "umgebung" : null;
    const ende = e && lesbar ? e.ende : env[g.name] ? String(env[g.name]).slice(-4) : null;
    geheim.push({
      ...g,
      gesetzt: Boolean(quelle),
      quelle,
      anzeige: ende ? `••••${ende}` : null,
      geaendert: e?.geaendert ?? null,
      von: e?.von ?? null,
      defekt: Boolean(e && !lesbar),
    });
  }
  const einstellungen = EINSTELLUNGEN.map((s) => {
    const e = daten.einstellungen[s.name];
    const wert = e?.wert || env[s.name] || "";
    return { ...s, wert, quelle: e?.wert ? "dashboard" : env[s.name] ? "umgebung" : null, geaendert: e?.geaendert ?? null };
  });
  return { masterOk, geheim, einstellungen };
}

export async function setzeGeheim(env, name, wert, von) {
  if (!GEHEIM.some((g) => g.name === name)) throw new Error("Unbekannter Schlüssel.");
  const klar = String(wert || "").trim();
  // Obergrenze großzügig: Lemon-Squeezy-Schlüssel sind JWTs mit rund 1000 Zeichen.
  if (klar.length < 8) throw new Error("Der Schlüssel sieht unvollständig aus.");
  if (klar.length > 8000) throw new Error("Der Schlüssel ist ungewöhnlich lang. Füg bitte nur den Schlüssel selbst ein.");
  const daten = await lade(env, true);
  daten.geheim[name] = { ...(await verschluesseln(env, klar)), ende: klar.slice(-4), geaendert: new Date().toISOString(), von };
  await speichere(env, daten);
}

export async function loescheGeheim(env, name) {
  const daten = await lade(env, true);
  delete daten.geheim[name];
  await speichere(env, daten);
}

export async function setzeEinstellung(env, name, wert, von) {
  if (!EINSTELLUNGEN.some((s) => s.name === name)) throw new Error("Unbekannte Einstellung.");
  const w = String(wert ?? "").trim().slice(0, 300);
  if (name === "ALPHA_DOWNLOAD_URL" && w && !/^https:\/\/(cockpit\.mesco\.cc|github\.com\/Stacktor\/cockpit-releases)\//.test(w)) throw new Error("Bitte den cockpit-Downloadlink oder das öffentliche cockpit-Release-Repo verwenden.");
  if (name === "DISCORD_URL" && w && !/^https:\/\/(discord\.gg|discord\.com)\//.test(w))
    throw new Error("Der Discord-Link muss mit https://discord.gg/ oder https://discord.com/ beginnen.");
  if (name === "POLAR_SERVER" && w && !["sandbox", "production"].includes(w.toLowerCase()))
    throw new Error("Bitte „sandbox“ oder „production“ eintragen.");
  if (name === "POLAR_ALPHA_CHECKOUT_URL" && w && !/^https:\/\/(sandbox-api\.|sandbox\.|api\.|buy\.)?polar\.sh\//.test(w))
    throw new Error("Das sieht nicht nach einem Polar-Checkout-Link aus.");
  if (name === "POLAR_ALPHA_BENEFIT_ID" && w && !/^[A-Za-z0-9-]+(,[A-Za-z0-9-]+)*$/.test(w.replace(/\s/g, "")))
    throw new Error("Benefit-IDs mit Komma trennen.");
  if (name === "LS_ALPHA_CHECKOUT_URL" && w && !/^https:\/\/[a-z0-9-]+\.lemonsqueezy\.com\/checkout\//.test(w))
    throw new Error("Das sieht nicht nach einem Lemon-Squeezy-Checkout-Link aus.");
  if (/_ID$/.test(name) && name !== "POLAR_ALPHA_BENEFIT_ID" && w && !/^[A-Za-z0-9-]+$/.test(w)) throw new Error("IDs enthalten nur Buchstaben, Ziffern und Bindestriche.");
  if (name === "DOCS_REPO" && w && !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(w)) throw new Error("Bitte als besitzer/name angeben, z. B. Stacktor/cockpit-docs.");
  if (name === "SITE_REPO" && w && !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(w)) throw new Error("Bitte als besitzer/name angeben, z. B. Stacktor/cockpit-website.");
  const daten = await lade(env, true);
  if (w) daten.einstellungen[name] = { wert: w, geaendert: new Date().toISOString(), von };
  else delete daten.einstellungen[name];
  await speichere(env, daten);
}

/** Probiert einen Schlüssel gegen den jeweiligen Dienst aus. */
export async function testeGeheim(env, name) {
  const werte = await mitSchluesseln(env);
  const k = werte[name];
  if (!k) return { ok: false, text: "Nicht gesetzt." };
  const pruefe = async (url, kopf) => {
    try {
      const r = await fetch(url, { headers: { "User-Agent": "cockpit-admin", ...kopf } });
      return r.status;
    } catch {
      return 0;
    }
  };
  let st;
  switch (name) {
    case "KEYGEN_PRODUCT_TOKEN": {
      const { keygen } = await import("../keygen.js");
      st = (await keygen(werte, "licenses?limit=1")).status;
      break;
    }
    case "POLAR_ACCESS_TOKEN": {
      const basis = String(werte.POLAR_SERVER || "").toLowerCase() === "sandbox" ? "https://sandbox-api.polar.sh" : "https://api.polar.sh";
      st = await pruefe(`${basis}/v1/organizations/`, { Authorization: `Bearer ${k}`, Accept: "application/json" });
      break;
    }
    case "LEMONSQUEEZY_API_KEY":
      st = await pruefe("https://api.lemonsqueezy.com/v1/users/me", { Authorization: `Bearer ${k}`, Accept: "application/vnd.api+json" });
      break;
    case "RESEND_API_KEY":
      st = await pruefe("https://api.resend.com/domains", { Authorization: `Bearer ${k}` });
      if (st === 403 || st === 401) {
        // „Sending access“-Schlüssel dürfen nichts lesen, sind aber gültig.
        const text = st === 403 ? "Gültig, darf aber nur senden. Für die Statistik brauchst du „Full access“." : "Ungültig.";
        return { ok: st === 403, text };
      }
      break;
    case "CF_ANALYTICS_TOKEN":
      st = await pruefe("https://api.cloudflare.com/client/v4/user/tokens/verify", { Authorization: `Bearer ${k}` });
      break;
    case "GITHUB_TOKEN":
    case "GITHUB_INHALT_TOKEN":
      st = await pruefe("https://api.github.com/rate_limit", { Authorization: `Bearer ${k}`, Accept: "application/vnd.github+json" });
      break;
    default:
      return { ok: false, text: "Kein Test vorhanden." };
  }
  if (st >= 200 && st < 300) return { ok: true, text: "Funktioniert." };
  if (st === 0) return { ok: false, text: "Dienst nicht erreichbar." };
  return { ok: false, text: st === 401 || st === 403 ? "Abgelehnt. Der Schlüssel ist ungültig oder hat keine Rechte." : `Antwort ${st}.` };
}

/** Nur für Tests: Zwischenspeicher leeren. */
export function _cacheLeeren() {
  cache = null;
}
