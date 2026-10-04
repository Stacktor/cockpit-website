/**
 * HTML vor dem Einfügen säubern: nur harmlose Elemente und Attribute bleiben,
 * Links nur auf http(s), Anker, mailto oder relative Pfade. Genutzt von der
 * Doku (GitHub-HTML) und der Vorschau im Inhalte-Editor (marked). Das sind die
 * einzigen Stellen im Admin, an denen HTML ins DOM kommt.
 */

const DOKU_TAGS = new Set(
  "A P BR HR H1 H2 H3 H4 H5 H6 UL OL LI PRE CODE BLOCKQUOTE TABLE THEAD TBODY TR TH TD EM STRONG B I DEL S KBD SUP SUB DL DT DD DETAILS SUMMARY IMG INPUT DIV SPAN".split(" "),
);
const DOKU_WEG = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "FORM", "TEMPLATE", "NOSCRIPT", "svg", "math"]);
const DOKU_ATTR = new Set(["href", "src", "alt", "title", "colspan", "rowspan", "align", "type", "checked", "disabled", "open", "id"]);
const SICHERE_URL = /^(https?:\/\/|#|mailto:)|^(?!\/\/)[\p{L}\p{N}_.\/()-]+(#[\w-]*)?$/u;

export function saeubern(html: string): DocumentFragment {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const raus: Element[] = [];
  for (const el of Array.from(doc.body.querySelectorAll("*"))) {
    if (!DOKU_TAGS.has(el.tagName) || (el.tagName === "INPUT" && el.getAttribute("type") !== "checkbox")) {
      raus.push(el);
      continue;
    }
    for (const a of Array.from(el.attributes)) {
      const n = a.name.toLowerCase();
      if (!DOKU_ATTR.has(n) || ((n === "href" || n === "src") && !SICHERE_URL.test(a.value.trim()))) el.removeAttribute(a.name);
    }
    if (el.tagName === "INPUT") el.setAttribute("disabled", "");
  }
  // Verbotene Elemente samt Inhalt entfernen, unbekannte nur „auspacken".
  for (const el of raus) {
    if (!el.isConnected) continue;
    if (DOKU_WEG.has(el.tagName) || el.namespaceURI !== "http://www.w3.org/1999/xhtml") el.remove();
    else el.replaceWith(...Array.from(el.childNodes));
  }
  const frag = document.createDocumentFragment();
  frag.append(...Array.from(doc.body.childNodes).map((k) => document.importNode(k, true)));
  return frag;
}

