import type { ImageProvider, PanelRenderInput } from "../types";
import type { RenderedPanel } from "@shared/types";
import { buildImagePrompt, aspectRatioForPanel } from "./prompt";

/**
 * Akamai Inference Cloud image adapter.
 *
 * Generates panel art on Akamai's distributed GPU inference (NVIDIA Blackwell).
 * Unlike the Magnific adapter, an Inference Cloud API key is a normal server
 * credential, so this provider is genuinely deployable. It targets an
 * OpenAI-compatible images endpoint and tolerates either an inline result or an
 * async "submit job -> poll status" shape.
 *
 * TODO: confirm the exact endpoint path + payload fields against the real
 * Akamai Inference Cloud API once a cloud account is provisioned — the request
 * shape below follows the documented OpenAI-compatible convention.
 *
 * Like every image provider it NEVER throws to the caller: on any failure it
 * returns a RenderedPanel with an `error` + placeholder, so one bad panel can't
 * kill a render.
 */
export class AkamaiImageProvider implements ImageProvider {
  readonly name = "akamai";
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor(opts: { apiKey: string; baseUrl: string; model: string }) {
    if (!opts.apiKey) {
      throw new Error("AKAMAI_API_KEY is required for the akamai image provider");
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

  /** Submit a generation request; return inline if present, else poll the job. */
  private async generate(prompt: string, aspectRatio: string): Promise<string> {
    const submit = await this.fetchJson(`${this.baseUrl}/v1/images/generations`, {
      method: "POST",
      body: JSON.stringify({
        model: this.model,
        prompt,
        size: sizeForAspect(aspectRatio),
        n: 1,
      }),
    });

    const inline = pickImageUrl(submit);
    if (inline) return inline;

    const jobId = submit?.id ?? submit?.job_id ?? submit?.requestId;
    if (!jobId) throw new Error("Akamai image: no image data or job id in response");

    return this.poll(String(jobId));
  }

  private async poll(jobId: string): Promise<string> {
    const maxAttempts = 30;
    const intervalMs = 2000;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await sleep(intervalMs);
      const status = await this.fetchJson(`${this.baseUrl}/v1/images/generations/${jobId}`, {
        method: "GET",
      });
      const url = pickImageUrl(status);
      if (url) return url;
      const state = String(status?.status ?? status?.state ?? "").toLowerCase();
      if (state === "failed" || state === "error") {
        throw new Error(`Akamai image job ${jobId} failed`);
      }
    }
    throw new Error(`Akamai image job ${jobId} timed out`);
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
      throw new Error(`Akamai image HTTP ${res.status}: ${body.slice(0, 200)}`);
    }
    return res.json();
  }
}

/** Map our aspect ratios to the pixel sizes OpenAI-style image APIs expect. */
function sizeForAspect(aspectRatio: string): string {
  switch (aspectRatio) {
    case "16:9":
      return "1344x768";
    case "4:3":
      return "1024x768";
    case "1:1":
    default:
      return "1024x1024";
  }
}

/**
 * Pull an image out of a variety of plausible response shapes — either a hosted
 * URL or inline base64 (which we wrap as a data URI so the client can render it
 * directly, exactly like the other providers).
 */
function pickImageUrl(obj: any): string | null {
  if (!obj || typeof obj !== "object") return null;
  const url =
    obj.url ??
    obj.image_url ??
    obj.imageUrl ??
    obj.output?.url ??
    obj.data?.[0]?.url ??
    obj.images?.[0]?.url ??
    obj.result?.[0]?.url ??
    null;
  if (url) return String(url);

  const b64 = obj.b64_json ?? obj.data?.[0]?.b64_json ?? obj.images?.[0]?.b64_json ?? null;
  if (b64) return `data:image/png;base64,${b64}`;

  return null;
}

function placeholder(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="#fdecec"/><rect x="6" y="6" width="788" height="588" fill="none" stroke="#c0392b" stroke-width="6"/><text x="400" y="300" text-anchor="middle" font-family="sans-serif" font-size="28" fill="#c0392b">image generation failed</text></svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
