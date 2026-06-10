import { useMemo } from "react";
import type {
  DialogueLine,
  MangaScript,
  Panel,
  RenderedPanel,
} from "@shared/types";

interface Props {
  script: MangaScript;
  panels: RenderedPanel[];
  onStartOver: () => void;
}

export default function MangaView({ script, panels, onStartOver }: Props) {
  const byId = useMemo(() => {
    const map = new Map<string, RenderedPanel>();
    for (const p of panels) map.set(p.panelId, p);
    return map;
  }, [panels]);

  function exportJson() {
    const data = JSON.stringify({ script, panels }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const slug =
      script.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") || "manga";
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const failed = panels.filter((p) => p.error);

  return (
    <div className={"manga-view manga-" + script.style}>
      <div className="manga-bar no-print">
        <div>
          <h2>{script.title}</h2>
          <p className="muted">{script.logline}</p>
        </div>
        <div className="toolbar-actions">
          <button className="btn" onClick={onStartOver}>
            Start over
          </button>
          <button className="btn" onClick={exportJson}>
            Export JSON
          </button>
          <button className="btn btn-primary" onClick={() => window.print()}>
            Print / Save as PDF
          </button>
        </div>
      </div>

      {failed.length > 0 && (
        <div className="error no-print" role="alert">
          {failed.length} panel{failed.length > 1 ? "s" : ""} failed to render and
          show a placeholder.
        </div>
      )}

      <div className="print-title only-print">
        <h1>{script.title}</h1>
        <p>{script.logline}</p>
      </div>

      <div className="manga-pages">
        {script.pages.map((page) => (
          <section className="manga-page" key={page.pageNumber}>
            <div className="page-label no-print">Page {page.pageNumber}</div>
            <div className="panel-grid">
              {page.panels.map((panel) => (
                <PanelCard
                  key={panel.id}
                  panel={panel}
                  rendered={byId.get(panel.id)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function PanelCard({
  panel,
  rendered,
}: {
  panel: Panel;
  rendered: RenderedPanel | undefined;
}) {
  const narration = panel.dialogue.filter((d) => d.kind === "narration");
  const balloons = panel.dialogue.filter((d) => d.kind !== "narration");

  return (
    <figure className={"panel panel-size-" + panel.size}>
      {rendered ? (
        <img className="panel-img" src={rendered.imageUrl} alt={panel.description} />
      ) : (
        <div className="panel-img panel-missing">No image</div>
      )}

      {narration.map((n, i) => (
        <div className="caption" key={"n" + i}>
          {n.text}
        </div>
      ))}

      <div className="balloons">
        {balloons.map((line, i) => (
          <Balloon key={i} line={line} />
        ))}
      </div>

      {panel.sfx && <div className="sfx">{panel.sfx}</div>}
    </figure>
  );
}

function Balloon({ line }: { line: DialogueLine }) {
  return (
    <div className={"balloon balloon-" + line.kind}>
      {line.speaker && <span className="balloon-speaker">{line.speaker}</span>}
      <span className="balloon-text">{line.text}</span>
    </div>
  );
}
