import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

/** Funktionen — je eine Unterseite unter /funktionen/<slug>/. */
const funktionen = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/funktionen" }),
  schema: z.object({
    titel: z.string(),
    kurz: z.string(),
    beschreibung: z.string(),
    icon: z.string(),
    reihenfolge: z.number(),
    /** Screenshot-Kennung aus src/assets/screens (ohne light-/dark-). */
    screen: z.string(),
    punkte: z.array(z.string()).min(3),
  }),
});

const blog = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/blog" }),
  schema: z.object({
    titel: z.string(),
    beschreibung: z.string(),
    datum: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    lesezeit: z.number(),
  }),
});

const hilfe = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/hilfe" }),
  schema: z.object({
    titel: z.string(),
    beschreibung: z.string(),
    reihenfolge: z.number(),
    icon: z.string(),
  }),
});

/** Roadmap — je Vorhaben eine Datei; Status bestimmt die Spalte auf /roadmap/. */
const roadmap = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/roadmap" }),
  schema: z.object({
    titel: z.string(),
    status: z.enum(["erledigt", "jetzt", "naechstes", "spaeter"]),
    reihenfolge: z.number(),
  }),
});

export const collections = { funktionen, blog, hilfe, roadmap };
