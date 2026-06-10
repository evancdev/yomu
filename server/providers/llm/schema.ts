import { z } from "zod";
import type { MangaScript, MangaStyle } from "@shared/types";

/**
 * Tolerant schema for raw LLM output. Models sometimes drift on enums or
 * forget ids, so we coerce/repair rather than hard-fail where it's safe.
 */
const dialogueSchema = z.object({
  speaker: z.string().default("???"),
  text: z.string().default(""),
  kind: z.enum(["speech", "thought", "narration"]).catch("speech"),
});

const panelSchema = z.object({
  id: z.string().optional(),
  description: z.string().default(""),
  shot: z.string().default("medium shot"),
  size: z.union([z.literal(1), z.literal(2), z.literal(3)]).catch(2),
  dialogue: z.array(dialogueSchema).default([]),
  sfx: z.string().optional(),
});

const pageSchema = z.object({
  pageNumber: z.number().optional(),
  panels: z.array(panelSchema).default([]),
});

const rawScriptSchema = z.object({
  title: z.string().default("Untitled"),
  logline: z.string().default(""),
  characters: z
    .array(z.object({ name: z.string(), appearance: z.string().default("") }))
    .default([]),
  pages: z.array(pageSchema).default([]),
});

/** Parse + normalize raw LLM JSON into a fully-formed MangaScript. */
export function normalizeScript(raw: unknown, style: MangaStyle): MangaScript {
  const parsed = rawScriptSchema.parse(raw);
  return {
    title: parsed.title,
    logline: parsed.logline,
    style,
    characters: parsed.characters,
    pages: parsed.pages.map((page, pi) => ({
      pageNumber: page.pageNumber ?? pi + 1,
      panels: page.panels.map((panel, ci) => ({
        id: panel.id || `p${pi + 1}-${ci + 1}`,
        description: panel.description,
        shot: panel.shot,
        size: panel.size,
        dialogue: panel.dialogue,
        sfx: panel.sfx && panel.sfx.trim() ? panel.sfx.trim() : undefined,
      })),
    })),
  };
}

/** Best-effort extraction of a JSON object from a model's text response. */
export function extractJson(text: string): unknown {
  const trimmed = text.trim();
  // Strip ```json fences if present.
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : trimmed;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("No JSON object found in LLM response");
  }
  return JSON.parse(body.slice(start, end + 1));
}
