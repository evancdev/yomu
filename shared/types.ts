/**
 * Shared types — the contract between the Yomu server and client.
 * Both `server/` and `client/src/` import from here via the "@shared/*" path alias.
 */

/** Visual style flag, threaded through both scripting and art generation. */
export type MangaStyle = "bw" | "color";

/** A single line of dialogue/thought within a panel. */
export interface DialogueLine {
  speaker: string;
  text: string;
  /** "speech" balloon, "thought" bubble, or off-panel "narration". */
  kind: "speech" | "thought" | "narration";
}

/** One manga panel: a visual beat plus the text overlaid on it. */
export interface Panel {
  id: string;
  /** Visual description fed to the image provider (the "what we see"). */
  description: string;
  /** Camera framing, e.g. "wide establishing shot", "extreme close-up". */
  shot: string;
  dialogue: DialogueLine[];
  /** Onomatopoeia / sound effect, e.g. "DON!!", optional. */
  sfx?: string;
  /** Relative visual weight on the page, 1 (small) – 3 (splash). */
  size: 1 | 2 | 3;
}

/** A page of the manga: an ordered set of panels. */
export interface Page {
  pageNumber: number;
  panels: Panel[];
}

/** A recurring character, captured so art stays consistent across panels. */
export interface Character {
  name: string;
  /** Stable appearance description reused in every panel prompt. */
  appearance: string;
}

/** The full editable script produced by the LLM provider. */
export interface MangaScript {
  title: string;
  logline: string;
  style: MangaStyle;
  characters: Character[];
  pages: Page[];
}

/** A rendered panel: original panel id mapped to its generated image. */
export interface RenderedPanel {
  panelId: string;
  /** Image URL or data URI the client can render directly in an <img>. */
  imageUrl: string;
  /** Provider that produced it, for display/debugging. */
  provider: string;
  /** Set when generation failed for this panel; imageUrl will be a placeholder. */
  error?: string;
}

// ---- API request/response shapes ----

export interface ScriptRequest {
  idea: string;
  style: MangaStyle;
  /** Desired number of pages (server clamps to a sane range). */
  pages?: number;
}

export interface ScriptResponse {
  script: MangaScript;
}

export interface RenderRequest {
  /** The (possibly user-edited) script to turn into art. */
  script: MangaScript;
}

export interface RenderResponse {
  panels: RenderedPanel[];
}

/** Reports which providers the server is actually running. */
export interface ConfigResponse {
  llmProvider: string;
  imageProvider: string;
  /** True when both providers are real (not mock) — i.e. live generation. */
  live: boolean;
}

export interface ApiError {
  error: string;
}
