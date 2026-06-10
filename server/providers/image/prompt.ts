import type { PanelRenderInput } from "../types";

const stylePrefix = {
  bw: "black and white manga panel, ink linework, screentone shading, high contrast, no color",
  color: "full-color webtoon panel, clean digital coloring, soft cel shading, vivid cohesive palette",
} as const;

const aspectForSize = {
  1: "1:1",
  2: "4:3",
  3: "16:9",
} as const;

/** Build the text-to-image prompt for a single panel. */
export function buildImagePrompt(input: PanelRenderInput): string {
  const { panel, characters, style } = input;
  const relevant = characters.filter((c) =>
    panel.description.toLowerCase().includes(c.name.toLowerCase()),
  );
  const charNote = relevant.length
    ? ` Character refs: ${relevant.map((c) => c.appearance).join(" ")}`
    : "";

  return [
    stylePrefix[style] + ",",
    `${panel.shot}.`,
    panel.description,
    charNote,
    "Comic/manga composition, expressive, dynamic. No speech bubbles, no text, no lettering.",
  ]
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function aspectRatioForPanel(size: 1 | 2 | 3): string {
  return aspectForSize[size];
}
