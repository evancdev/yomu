import type { MangaStyle } from "@shared/types";

const styleDirection: Record<MangaStyle, string> = {
  bw: "Black-and-white manga: ink linework, screentone shading, dramatic contrast, classic shonen/seinen sensibility.",
  color: "Full-color webtoon: clean digital coloring, soft cel shading, vivid but cohesive palette.",
};

/** System prompt instructing the model to act as a manga editor + scriptwriter. */
export function systemPrompt(): string {
  return [
    "You are a veteran manga editor and storyboard artist.",
    "You turn a one-line idea into a tight, visually-driven manga script.",
    "You think in panels: each panel is a single visual beat with clear staging.",
    "Dialogue is sparse and punchy. You use sound effects (sfx) for impact.",
    "You design 1-4 recurring characters with fixed, reusable appearance descriptions",
    "so the art stays consistent panel to panel.",
    "You ALWAYS respond with a single valid JSON object and nothing else.",
  ].join(" ");
}

/** The user-turn prompt carrying the idea, style and shape constraints. */
export function userPrompt(input: {
  idea: string;
  style: MangaStyle;
  pages: number;
}): string {
  return `Write a manga script.

IDEA: ${input.idea}

STYLE: ${styleDirection[input.style]}
PAGES: ${input.pages} (aim for 2-5 panels per page; vary panel sizes for rhythm).

Return JSON matching EXACTLY this shape (no markdown, no commentary):
{
  "title": string,
  "logline": string,            // one sentence
  "characters": [               // 1-4 entries
    { "name": string, "appearance": string }  // appearance = stable visual desc reused every panel
  ],
  "pages": [
    {
      "pageNumber": number,
      "panels": [
        {
          "id": string,               // unique, e.g. "p1-1"
          "description": string,      // pure visual: setting, character poses, expression, action. NO dialogue here.
          "shot": string,             // camera framing, e.g. "low-angle wide shot"
          "size": 1 | 2 | 3,          // 1 small, 2 medium, 3 splash/full-width
          "dialogue": [
            { "speaker": string, "text": string, "kind": "speech" | "thought" | "narration" }
          ],
          "sfx": string               // optional onomatopoeia; omit or "" if none
        }
      ]
    }
  ]
}`;
}
