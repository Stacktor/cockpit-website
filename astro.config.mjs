// @ts-check
import { defineConfig } from "astro/config";

// Statische Seite für Cloudflare Pages. `functions/` (Pages Functions) und `lib/`
// liegen weiter im Repo-Wurzelverzeichnis und werden von Cloudflare direkt
// genommen — Astro baut nur die Seiten nach `dist/`.
export default defineConfig({
  site: "https://cockpit.mesco.cc",
  trailingSlash: "ignore",
  build: { format: "directory" },
  prefetch: { prefetchAll: true, defaultStrategy: "hover" },
  devToolbar: { enabled: false },
});
