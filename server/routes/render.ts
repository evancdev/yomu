import { Router } from "express";
import { z } from "zod";
import type { RenderResponse, RenderedPanel } from "@shared/types";
import { createImageProvider } from "../providers/registry";

const dialogueSchema = z.object({
  speaker: z.string(),
  text: z.string(),
  kind: z.enum(["speech", "thought", "narration"]),
});

const panelSchema = z.object({
  id: z.string(),
  description: z.string(),
  shot: z.string(),
  size: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  dialogue: z.array(dialogueSchema),
  sfx: z.string().optional(),
});

const scriptSchema = z.object({
  title: z.string(),
  logline: z.string(),
  style: z.enum(["bw", "color"]),
  characters: z.array(z.object({ name: z.string(), appearance: z.string() })),
  pages: z.array(z.object({ pageNumber: z.number(), panels: z.array(panelSchema) })),
});

const bodySchema = z.object({ script: scriptSchema });

/** Render panels with bounded concurrency so we don't hammer the provider. */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export const renderRouter = Router();

renderRouter.post("/render", async (req, res) => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "invalid script" });
  }

  const { script } = parsed.data;
  const panels = script.pages.flatMap((p) => p.panels);
  if (panels.length === 0) {
    return res.status(400).json({ error: "script has no panels" });
  }

  try {
    const image = createImageProvider();
    const rendered: RenderedPanel[] = await mapWithConcurrency(panels, 3, (panel) =>
      image.renderPanel({ panel, characters: script.characters, style: script.style }),
    );
    const response: RenderResponse = { panels: rendered };
    res.json(response);
  } catch (err) {
    console.error("[/api/render] failed:", err);
    res.status(502).json({
      error: err instanceof Error ? err.message : "render failed",
    });
  }
});
