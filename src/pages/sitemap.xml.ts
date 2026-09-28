import { getCollection } from "astro:content";
import { SITE } from "../config";

export async function GET() {
  const [funktionen, blog, hilfe] = await Promise.all([getCollection("funktionen"), getCollection("blog"), getCollection("hilfe")]);
  const pfade = [
    "/",
    "/funktionen/",
    ...funktionen.map((f) => `/funktionen/${f.id}/`),
    "/preise/",
    "/download/",
    "/changelog/",
    "/alpha/",
    "/ueber/",
    "/blog/",
    ...blog.map((b) => `/blog/${b.id}/`),
    "/hilfe/",
    ...hilfe.map((h) => `/hilfe/${h.id}/`),
  ];
  const urls = pfade.map((p) => `<url><loc>${new URL(p, SITE.url).href}</loc></url>`).join("");
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
