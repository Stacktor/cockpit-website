/** Zentrale Angaben der Website — an einer Stelle pflegen. */
export const SITE = {
  name: "Bewerbungs-Cockpit",
  url: "https://cockpit.mesco.cc",
  mail: "Kontakt@mesco.cc",
  /** Discord-Einladung — leer lassen, solange der Server noch nicht steht. */
  discord: "",
  version: "0.1 Alpha",
  /** Fallback, falls /api/alpha nicht antwortet. Live-Wert kommt aus dem Admin. */
  alphaPlaetze: 50,
  releases: "https://github.com/Stacktor/cockpit-releases/releases",
};

/** Feste Dateinamen im öffentlichen Release-Repo (siehe release.yml der App). */
export const DOWNLOADS = {
  windows: `${SITE.releases}/latest/download/cockpit-windows-setup.exe`,
  windowsMsi: `${SITE.releases}/latest/download/cockpit-windows.msi`,
  appimage: `${SITE.releases}/latest/download/cockpit-linux-x86_64.AppImage`,
  deb: `${SITE.releases}/latest/download/cockpit-linux-amd64.deb`,
};
