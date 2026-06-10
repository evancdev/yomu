import type {
  MangaScript,
  MangaStyle,
  Panel,
  Character,
  RenderedPanel,
} from "@shared/types";

/**
 * Writes a structured, editable manga script from a freeform idea.
 * Implementations: mock (deterministic), anthropic (Claude API).
 */
export interface LLMProvider {
  readonly name: string;
  generateScript(input: {
    idea: string;
    style: MangaStyle;
    pages: number;
  }): Promise<MangaScript>;
}

/** Context handed to the image provider for a single panel. */
export interface PanelRenderInput {
  panel: Panel;
  /** Recurring characters, so the provider can keep appearances consistent. */
  characters: Character[];
  style: MangaStyle;
}

/**
 * Turns a panel's visual description into an image.
 * Implementations: mock (SVG placeholder), magnific (REST adapter).
 */
export interface ImageProvider {
  readonly name: string;
  renderPanel(input: PanelRenderInput): Promise<RenderedPanel>;
}

export type { MangaScript, RenderedPanel };
