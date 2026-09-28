import { getCollection } from "astro:content";
import { SITE } from "../../config";

const x = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function GET() {
  const beitraege = (await getCollection("blog")).sort((a, b) => +b.data.datum - +a.data.datum);
  const items = beitraege
    .map((b) => {
      const url = new URL(`/blog/${b.id}/`, SITE.url).href;
      return `<item><title>${x(b.data.titel)}</title><link>${url}</link><guid>${url}</guid><pubDate>${b.data.datum.toUTCString()}</pubDate><description>${x(b.data.beschreibung)}</description></item>`;
    })
    .join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>cockpit-Blog</title><link>${SITE.url}/blog/</link><description>Neuigkeiten und Hintergründe zu Bewerbungs-Cockpit</description><language>de-de</language>${items}</channel></rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
