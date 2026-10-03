/**
 * Lesezeit eines Beitrags aus dem echten Text: rund 200 Wörter pro Minute,
 * Markdown-Zeichen und Links zählen nicht mit. Mindestens eine Minute.
 */
export function lesezeit(markdown: string | undefined): number {
  const text = (markdown ?? "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`|~-]+/g, " ");
  const woerter = text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
  return Math.max(1, Math.round(woerter / 200));
}
