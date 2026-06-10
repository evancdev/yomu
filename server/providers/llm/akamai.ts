import type { LLMProvider } from "../types";
import type { MangaScript, MangaStyle } from "@shared/types";
import { systemPrompt, userPrompt } from "./prompt";
import { extractJson, normalizeScript } from "./schema";

/**
 * Akamai Inference Cloud script writer.
 *
 * Talks to Akamai's OpenAI-compatible chat-completions endpoint, so any open
 * model hosted on Inference Cloud (Llama-class, etc.) can draft scripts. It
 * reuses the exact same prompts + tolerant JSON normalization as the Claude
 * provider, so the script step behaves identically regardless of which LLM
 * backs it — only the transport differs.
 *
 * Unlike Claude (official SDK) this is a plain fetch adapter, so it adds no new
 * dependency. The base URL must point at the Inference Cloud endpoint serving an
 * OpenAI-compatible `/v1/chat/completions` route.
 */
export class AkamaiLLMProvider implements LLMProvider {
  readonly name = "akamai";
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor(opts: { apiKey: string; baseUrl: string; model: string }) {
    if (!opts.apiKey) {
      throw new Error("AKAMAI_API_KEY is required for the akamai LLM provider");
    }
    this.apiKey = opts.apiKey;
    this.baseUrl = opts.baseUrl.replace(/\/$/, "");
    this.model = opts.model;
  }

  async generateScript(input: {
    idea: string;
    style: MangaStyle;
    pages: number;
  }): Promise<MangaScript> {
    const res = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 4096,
        temperature: 0.8,
        // Most OpenAI-compatible servers honor this; harmless if ignored since
        // extractJson() still tolerates fenced/wrapped output.
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt() },
          { role: "user", content: userPrompt(input) },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Akamai Inference HTTP ${res.status}: ${body.slice(0, 200)}`);
    }

    const data: any = await res.json();
    const text: string = data?.choices?.[0]?.message?.content ?? "";
    if (!text) {
      throw new Error("Akamai Inference: empty completion");
    }

    const raw = extractJson(text);
    return normalizeScript(raw, input.style);
  }
}
