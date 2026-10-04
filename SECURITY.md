# Sicherheit

Sicherheitslücken in der Website, den Schnittstellen unter `cockpit.mesco.cc/api/` oder dem Admin
bitte **nicht** als öffentliches Issue melden, sondern per Mail an **Kontakt@mesco.cc** mit dem
Betreff „Sicherheit“. Der Eingang wird innerhalb von drei Werktagen bestätigt.

## Im Umfang

- Pages Functions unter `functions/api/` (Alpha-Anmeldung, Fehlerberichte, Umfragen, Sync, Lizenz)
- das Admin unter `/admin/` und `/api/admin/*` (Zugang über Cloudflare Access, Schreibzugriffe nur
  same-origin und als JSON, Schlüssel verschlüsselt im Tresor)
- der Sync-Speicher (nur Ende-zu-Ende verschlüsselte Pakete, Zugriff je Lizenz)

Lücken in der App selbst bitte nach der
[SECURITY.md der App](https://github.com/Stacktor/cockpit-releases/blob/main/SECURITY.md) melden.
