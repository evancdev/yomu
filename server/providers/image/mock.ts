import type { ImageProvider, PanelRenderInput } from "../types";
import type { RenderedPanel } from "@shared/types";

/**
 * Offline image provider: renders each panel as a self-contained SVG data URI
 * that sketches the shot + visual description inside a manga frame. Lets the
 * full app (layout, balloons, export) work with zero API access.
 */
export class MockImageProvider implements ImageProvider {
  readonly name = "mock";

  async renderPanel(input: PanelRenderInput): Promise<RenderedPanel> {
    const svg = panelSvg(input);
    const dataUri = "data:image/svg+xml;utf8," + encodeURIComponent(svg);
    return { panelId: input.panel.id, imageUrl: dataUri, provider: this.name };
  }
}

function panelSvg(input: PanelRenderInput): string {
  const { panel, style } = input;
  const isColor = style === "color";
  const bg = isColor ? "#eef3fb" : "#f4f4f4";
  const ink = "#111";
  const accent = isColor ? "#3b6fd4" : "#444";
  const W = 800;
  const H = panel.size === 3 ? 450 : panel.size === 2 ? 600 : 800;

  const wrapped = wrapText(panel.description, 46).slice(0, 6);
  const descLines = wrapped
    .map(
      (line, i) =>
        `<text x="48" y="${180 + i * 30}" font-family="Georgia, serif" font-size="22" fill="${ink}">${escapeXml(
          line,
        )}</text>`,
    )
    .join("");

  const sfx = panel.sfx
    ? `<text x="${W - 48}" y="${H - 56}" text-anchor="end" font-family="Impact, sans-serif" font-size="64" fill="${accent}" transform="rotate(-6 ${W - 48} ${H - 56})">${escapeXml(
        panel.sfx,
      )}</text>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${bg}"/>
  <rect x="6" y="6" width="${W - 12}" height="${H - 12}" fill="none" stroke="${ink}" stroke-width="6"/>
  <text x="48" y="80" font-family="Impact, sans-serif" font-size="30" fill="${accent}">PANEL ${escapeXml(
    panel.id,
  )}</text>
  <text x="48" y="120" font-family="Georgia, serif" font-size="20" font-style="italic" fill="${ink}">${escapeXml(
    panel.shot,
  )}</text>
  <line x1="48" y1="140" x2="${W - 48}" y2="140" stroke="${accent}" stroke-width="2"/>
  ${descLines}
  ${sfx}
</svg>`;
}

function wrapText(text: string, max: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > max) {
      if (cur) lines.push(cur);
      cur = w;
    } else {
      cur = (cur + " " + w).trim();
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
