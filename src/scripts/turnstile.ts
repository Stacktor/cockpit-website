/** Erst beim finalen Absenden laden und ausführen, niemals beim Weiterblättern. */
type Turnstile = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  execute: (id: string) => void;
  remove: (id: string) => void;
};
type TurnstileWindow = Window & { turnstile?: Turnstile; cockpitTurnstileReady?: () => void };
let laden: Promise<Turnstile> | undefined;
export class SicherheitsFehler extends Error {}

function ladeTurnstile(): Promise<Turnstile> {
  const fenster = window as TurnstileWindow;
  if (laden) return laden;
  laden = new Promise<Turnstile>((resolve, reject) => {
    const script = document.createElement("script");
    const timer = window.setTimeout(() => fehlgeschlagen(), 15_000);
    const fehlgeschlagen = () => {
      window.clearTimeout(timer);
      script.remove();
      delete fenster.cockpitTurnstileReady;
      laden = undefined;
      reject(new SicherheitsFehler("Die Sicherheitsprüfung konnte nicht geladen werden. Bitte prüfe deine Verbindung oder deinen Inhaltsblocker und versuch es noch einmal."));
    };
    // Bei async/defer verlangt Cloudflare den onload-Parameter, nicht ready().
    fenster.cockpitTurnstileReady = () => {
      if (!fenster.turnstile) return fehlgeschlagen();
      window.clearTimeout(timer);
      delete fenster.cockpitTurnstileReady;
      resolve(fenster.turnstile);
    };
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=cockpitTurnstileReady";
    script.async = true;
    script.onerror = fehlgeschlagen;
    document.head.append(script);
  });
  return laden;
}

export function anmeldungPruefen(container: HTMLElement): {
  pruefen: () => Promise<string>;
  aufraeumen: () => void;
} {
  let api: Turnstile | undefined;
  let id: string | undefined;
  const aufraeumen = () => {
    try { if (api && id !== undefined) api.remove(id); } catch { /* Auch nach Widget-Fehlern erneut abschicken können. */ }
    id = undefined;
    container.replaceChildren();
  };
  return {
    aufraeumen,
    async pruefen() {
      aufraeumen();
      const configAntwort = await fetch("/api/alpha", { cache: "no-store", signal: AbortSignal.timeout(10_000) });
      const config = await configAntwort.json();
      if (!configAntwort.ok || typeof config.turnstileSiteKey !== "string" || !config.turnstileSiteKey) {
        throw new SicherheitsFehler("Die Sicherheitsprüfung ist gerade nicht verfügbar. Bitte versuch es später noch einmal.");
      }
      api = await ladeTurnstile();
      return new Promise<string>((resolve, reject) => {
        const timer = window.setTimeout(() => fehler("Die Sicherheitsprüfung dauert zu lange. Bitte versuch es noch einmal."), 120_000);
        const fehler = (text: string) => {
          window.clearTimeout(timer);
          reject(new SicherheitsFehler(text));
        };
        try {
          id = api!.render(container, {
            sitekey: config.turnstileSiteKey,
            action: "alpha_signup",
            execution: "execute",
            appearance: "interaction-only",
            language: "de",
            theme: "auto",
            size: container.clientWidth < 300 ? "compact" : "flexible",
            "response-field": false,
            retry: "never",
            "refresh-expired": "manual",
            callback: (token: string) => { window.clearTimeout(timer); resolve(token); },
            "error-callback": (code: string) => {
              console.warn("[cockpit] Turnstile-Prüfung fehlgeschlagen:", code);
              fehler("Die Sicherheitsprüfung ist fehlgeschlagen. Bitte versuch es noch einmal.");
              return true;
            },
            "expired-callback": () => fehler("Die Sicherheitsprüfung ist abgelaufen. Bitte versuch es noch einmal."),
            "timeout-callback": () => fehler("Die Sicherheitsprüfung ist abgelaufen. Bitte versuch es noch einmal."),
            "before-interactive-callback": () => container.scrollIntoView({ block: "center", behavior: "smooth" }),
          });
          api!.execute(id);
        } catch {
          fehler("Die Sicherheitsprüfung konnte nicht gestartet werden. Bitte versuch es noch einmal.");
        }
      });
    },
  };
}
