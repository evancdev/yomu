import { Router } from "express";
import { z } from "zod";
import type { ScriptResponse } from "@shared/types";
import { createLLMProvider } from "../providers/registry";

const bodySchema = z.object({
  idea: z.string().min(1, "idea is required").max(2000),
  style: z.enum(["bw", "color"]),
  pages: z.number().int().min(1).max(6).optional(),
});

export const scriptRouter = Router();

scriptRouter.post("/script", async (req, res) => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "invalid request" });
  }

  const { idea, style, pages = 3 } = parsed.data;
  try {
    const llm = createLLMProvider();
    const script = await llm.generateScript({ idea, style, pages });
    const response: ScriptResponse = { script };
    res.json(response);
  } catch (err) {
    console.error("[/api/script] failed:", err);
    res.status(502).json({
      error: err instanceof Error ? err.message : "script generation failed",
    });
  }
});
