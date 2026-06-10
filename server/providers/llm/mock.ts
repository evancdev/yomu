import type { LLMProvider } from "../types";
import type { MangaScript, MangaStyle, Page } from "@shared/types";

/**
 * Deterministic offline script writer. Produces a coherent, well-shaped
 * MangaScript from any idea without an API key — used as the default and for
 * local dev/tests. It echoes the idea into a simple but valid 3-beat structure.
 */
export class MockLLMProvider implements LLMProvider {
  readonly name = "mock";

  async generateScript(input: {
    idea: string;
    style: MangaStyle;
    pages: number;
  }): Promise<MangaScript> {
    const idea = input.idea.trim() || "A quiet hero discovers an extraordinary power";
    const hero = "Aki";
    const rival = "Ren";
    const beats = [
      {
        desc: `Establishing shot of the world implied by: "${idea}". ${hero} stands small against a vast backdrop, determined.`,
        shot: "wide establishing shot",
        size: 3 as const,
        line: { speaker: hero, text: "So this is where it begins.", kind: "speech" as const },
        sfx: undefined as string | undefined,
      },
      {
        desc: `Close on ${hero}'s face, eyes sharpening as the central conflict of "${idea}" arrives.`,
        shot: "extreme close-up",
        size: 2 as const,
        line: { speaker: hero, text: "I won't run this time.", kind: "thought" as const },
        sfx: "DOKI",
      },
      {
        desc: `${rival} steps from the shadows opposite ${hero}; tension crackles between them.`,
        shot: "two-shot, low angle",
        size: 2 as const,
        line: { speaker: rival, text: "You're too late.", kind: "speech" as const },
        sfx: undefined,
      },
      {
        desc: `Action splash: ${hero} unleashes the power at the heart of "${idea}".`,
        shot: "dynamic full-bleed splash",
        size: 3 as const,
        line: { speaker: "", text: "The moment everything changes.", kind: "narration" as const },
        sfx: "DON!!",
      },
    ];

    const pageCount = Math.max(1, Math.min(input.pages, 6));
    const pages: Page[] = Array.from({ length: pageCount }, (_, pi) => {
      // Distribute beats across pages, 2 panels per page.
      const a = beats[(pi * 2) % beats.length];
      const b = beats[(pi * 2 + 1) % beats.length];
      return {
        pageNumber: pi + 1,
        panels: [a, b].map((beat, ci) => ({
          id: `p${pi + 1}-${ci + 1}`,
          description: beat.desc,
          shot: beat.shot,
          size: beat.size,
          dialogue: beat.line.text ? [beat.line] : [],
          sfx: beat.sfx,
        })),
      };
    });

    return {
      title: titleFromIdea(idea),
      logline: idea,
      style: input.style,
      characters: [
        { name: hero, appearance: `${hero}: teenager, messy dark hair, worn jacket, sharp resolute eyes.` },
        { name: rival, appearance: `${rival}: tall, pale, long coat, cold half-smile, silver hair.` },
      ],
      pages,
    };
  }
}

function titleFromIdea(idea: string): string {
  const words = idea.split(/\s+/).slice(0, 4).join(" ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}
