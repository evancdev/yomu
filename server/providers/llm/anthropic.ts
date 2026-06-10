import Anthropic from "@anthropic-ai/sdk";
import type { LLMProvider } from "../types";
import type { MangaScript, MangaStyle } from "@shared/types";
import { systemPrompt, userPrompt } from "./prompt";
import { extractJson, normalizeScript } from "./schema";

/** Claude-backed script writer. Returns a normalized MangaScript. */
export class AnthropicLLMProvider implements LLMProvider {
  readonly name = "anthropic";
  private client: Anthropic;
  private model: string;

  constructor(opts: { apiKey: string; model: string }) {
    if (!opts.apiKey) {
      throw new Error("ANTHROPIC_API_KEY is required for the anthropic LLM provider");
    }
    this.client = new Anthropic({ apiKey: opts.apiKey });
    this.model = opts.model;
  }

  async generateScript(input: {
    idea: string;
    style: MangaStyle;
    pages: number;
  }): Promise<MangaScript> {
    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      system: systemPrompt(),
      messages: [{ role: "user", content: userPrompt(input) }],
    });

    const text = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    const raw = extractJson(text);
    return normalizeScript(raw, input.style);
  }
}
