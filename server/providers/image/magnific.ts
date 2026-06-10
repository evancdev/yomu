import type { ImageProvider, PanelRenderInput } from "../types";
import type { RenderedPanel } from "@shared/types";
import { buildImagePrompt, aspectRatioForPanel } from "./prompt";

/**
 * Magnific REST adapter.
 *
 * IMPORTANT: Magnific requires a premium account, and the MCP/OAuth session used
 * during development is NOT reusable from a deployed server. This adapter targets
 * a generic "submit job -> poll status -> get url" REST shape. The exact endpoint
 * paths and payload fields must be confirmed against the real Magnific REST API
 * once premium access + an API key are available — see the TODO markers below.
 *
 * It never throws to the caller: on any failure it returns a RenderedPanel carrying
 * an `error` and a placeholder image, so a single bad panel can't kill a render.
 */
export class MagnificImageProvider implements ImageProvider {
  readonly name = "magnific";
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor(opts: { apiKey: string; baseUrl: string; model: string }) {
    if (!opts.apiKey) {
      throw new Error("MAGNIFIC_API_KEY is required for the magnific image provider");
    }
    this.apiKey = opts.apiKey;
    this.baseUrl = opts.baseUrl.replace(/\/$/, "");
    this.model = opts.model;
  }

  async renderPanel(input: PanelRenderInput): Promise<RenderedPanel> {
    const prompt = buildImagePrompt(input);
    try {
      const imageUrl = await this.generate(prompt, aspectRatioForPanel(input.panel.size));
      return { panelId: input.panel.id, imageUrl, provider: this.name };
    } catch (err) {
      return {
        panelId: input.panel.id,
        imageUrl: placeholder(),
        provider: this.name,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /** Submit a generation job and poll until an image URL is available. */
  private async generate(prompt: string, aspectRatio: string): Promise<string> {
    // TODO: confirm endpoint + payload against the real Magnific REST API.
    const submit = await this.fetchJson(`${this.baseUrl}/v1/images/generate`, {
      method: "POST",
      body: JSON.stringify({
        prompt,
        model: this.model,
        aspect_ratio: aspectRatio,
        count: 1,
      }),
    });

    // Job may complete inline or asynchronously.
    const inlineUrl = pickImageUrl(submit);
    if (inlineUrl) return inlineUrl;

    const jobId = submit?.id ?? submit?.job_id ?? submit?.requestId;
    if (!jobId) throw new Error("Magnific: no image URL or job id in response");

    return this.poll(String(jobId));
  }

  private async poll(jobId: string): Promise<string> {
    const maxAttempts = 30;
    const intervalMs = 2000;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await sleep(intervalMs);
      // TODO: confirm status endpoint shape.
      const status = await this.fetchJson(`${this.baseUrl}/v1/jobs/${jobId}`, {
        method: "GET",
      });
      const url = pickImageUrl(status);
      if (url) return url;
      const state = String(status?.status ?? status?.state ?? "").toLowerCase();
      if (state === "failed" || state === "error") {
        throw new Error(`Magnific job ${jobId} failed`);
      }
    }
    throw new Error(`Magnific job ${jobId} timed out`);
  }

  private async fetchJson(url: string, init: RequestInit): Promise<any> {
    const res = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Magnific HTTP ${res.status}: ${body.slice(0, 200)}`);
    }
    return res.json();
  }
}

/** Pull an image URL out of a variety of plausible response shapes. */
function pickImageUrl(obj: any): string | null {
  if (!obj || typeof obj !== "object") return null;
  return (
    obj.url ??
    obj.image_url ??
    obj.imageUrl ??
    obj.output?.url ??
    obj.images?.[0]?.url ??
    obj.data?.[0]?.url ??
    obj.result?.[0]?.url ??
    null
  );
}

function placeholder(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="#fdecec"/><rect x="6" y="6" width="788" height="588" fill="none" stroke="#c0392b" stroke-width="6"/><text x="400" y="300" text-anchor="middle" font-family="sans-serif" font-size="28" fill="#c0392b">image generation failed</text></svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
