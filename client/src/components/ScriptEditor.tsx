import { useState } from "react";
import type {
  Character,
  DialogueLine,
  MangaScript,
  Panel,
} from "@shared/types";

interface Props {
  initialScript: MangaScript;
  rendering: boolean;
  onBack: () => void;
  onRender: (script: MangaScript) => void;
}

const KINDS: DialogueLine["kind"][] = ["speech", "thought", "narration"];
const SIZES: Panel["size"][] = [1, 2, 3];

let idCounter = 0;
function newPanelId(): string {
  idCounter += 1;
  return `p-edit-${Date.now()}-${idCounter}`;
}

export default function ScriptEditor({
  initialScript,
  rendering,
  onBack,
  onRender,
}: Props) {
  const [script, setScript] = useState<MangaScript>(initialScript);

  function patch(update: Partial<MangaScript>) {
    setScript((s) => ({ ...s, ...update }));
  }

  function updateCharacter(index: number, update: Partial<Character>) {
    patch({
      characters: script.characters.map((c, i) =>
        i === index ? { ...c, ...update } : c
      ),
    });
  }

  function addCharacter() {
    patch({ characters: [...script.characters, { name: "", appearance: "" }] });
  }

  function removeCharacter(index: number) {
    patch({ characters: script.characters.filter((_, i) => i !== index) });
  }

  function updatePanel(pageIdx: number, panelIdx: number, update: Partial<Panel>) {
    patch({
      pages: script.pages.map((page, pi) =>
        pi !== pageIdx
          ? page
          : {
              ...page,
              panels: page.panels.map((panel, pj) =>
                pj === panelIdx ? { ...panel, ...update } : panel
              ),
            }
      ),
    });
  }

  function addPanel(pageIdx: number) {
    const fresh: Panel = {
      id: newPanelId(),
      description: "",
      shot: "medium shot",
      size: 1,
      dialogue: [],
    };
    patch({
      pages: script.pages.map((page, pi) =>
        pi === pageIdx ? { ...page, panels: [...page.panels, fresh] } : page
      ),
    });
  }

  function removePanel(pageIdx: number, panelIdx: number) {
    patch({
      pages: script.pages.map((page, pi) =>
        pi !== pageIdx
          ? page
          : { ...page, panels: page.panels.filter((_, pj) => pj !== panelIdx) }
      ),
    });
  }

  function updateDialogue(
    pageIdx: number,
    panelIdx: number,
    lineIdx: number,
    update: Partial<DialogueLine>
  ) {
    const panel = script.pages[pageIdx].panels[panelIdx];
    updatePanel(pageIdx, panelIdx, {
      dialogue: panel.dialogue.map((l, li) =>
        li === lineIdx ? { ...l, ...update } : l
      ),
    });
  }

  function addDialogue(pageIdx: number, panelIdx: number) {
    const panel = script.pages[pageIdx].panels[panelIdx];
    updatePanel(pageIdx, panelIdx, {
      dialogue: [...panel.dialogue, { speaker: "", text: "", kind: "speech" }],
    });
  }

  function removeDialogue(pageIdx: number, panelIdx: number, lineIdx: number) {
    const panel = script.pages[pageIdx].panels[panelIdx];
    updatePanel(pageIdx, panelIdx, {
      dialogue: panel.dialogue.filter((_, li) => li !== lineIdx),
    });
  }

  const panelCount = script.pages.reduce((n, p) => n + p.panels.length, 0);

  return (
    <div className="script-editor">
      <div className="editor-toolbar card">
        <div>
          <h2>Review &amp; edit your script</h2>
          <p className="muted">
            Shape every beat before art is drawn. {script.pages.length}{" "}
            {script.pages.length === 1 ? "page" : "pages"} · {panelCount} panels ·{" "}
            {script.style === "bw" ? "B&W" : "Color"}.
          </p>
        </div>
        <div className="toolbar-actions">
          <button className="btn" onClick={onBack} disabled={rendering}>
            Start over
          </button>
          <button
            className="btn btn-primary"
            onClick={() => onRender(script)}
            disabled={rendering}
          >
            {rendering ? "Generating manga…" : "Generate manga"}
          </button>
        </div>
      </div>

      <section className="card">
        <label className="field">
          <span className="field-label">Title</span>
          <input
            className="input title-input"
            value={script.title}
            onChange={(e) => patch({ title: e.target.value })}
          />
        </label>
        <label className="field">
          <span className="field-label">Logline</span>
          <textarea
            className="textarea"
            rows={2}
            value={script.logline}
            onChange={(e) => patch({ logline: e.target.value })}
          />
        </label>
      </section>

      <section className="card">
        <div className="section-head">
          <h3>Characters</h3>
          <button className="btn btn-sm" onClick={addCharacter}>
            + Add character
          </button>
        </div>
        {script.characters.length === 0 && (
          <p className="muted">No characters yet.</p>
        )}
        {script.characters.map((c, i) => (
          <div className="char-row" key={i}>
            <input
              className="input"
              placeholder="Name"
              value={c.name}
              onChange={(e) => updateCharacter(i, { name: e.target.value })}
            />
            <input
              className="input"
              placeholder="Appearance"
              value={c.appearance}
              onChange={(e) => updateCharacter(i, { appearance: e.target.value })}
            />
            <button
              className="btn btn-icon"
              title="Remove character"
              onClick={() => removeCharacter(i)}
            >
              ✕
            </button>
          </div>
        ))}
      </section>

      {script.pages.map((page, pageIdx) => (
        <section className="card page-card" key={page.pageNumber}>
          <div className="section-head">
            <h3>Page {page.pageNumber}</h3>
            <button className="btn btn-sm" onClick={() => addPanel(pageIdx)}>
              + Add panel
            </button>
          </div>

          {page.panels.map((panel, panelIdx) => (
            <div className="panel-edit" key={panel.id}>
              <div className="panel-edit-head">
                <span className="panel-tag">Panel {panelIdx + 1}</span>
                <button
                  className="btn btn-icon"
                  title="Remove panel"
                  onClick={() => removePanel(pageIdx, panelIdx)}
                >
                  ✕
                </button>
              </div>

              <label className="field">
                <span className="field-label">Description</span>
                <textarea
                  className="textarea"
                  rows={2}
                  value={panel.description}
                  onChange={(e) =>
                    updatePanel(pageIdx, panelIdx, { description: e.target.value })
                  }
                />
              </label>

              <div className="field-row">
                <label className="field flex-2">
                  <span className="field-label">Shot</span>
                  <input
                    className="input"
                    value={panel.shot}
                    onChange={(e) =>
                      updatePanel(pageIdx, panelIdx, { shot: e.target.value })
                    }
                  />
                </label>
                <div className="field">
                  <span className="field-label">Size</span>
                  <div className="toggle">
                    {SIZES.map((sz) => (
                      <button
                        type="button"
                        key={sz}
                        className={
                          "toggle-btn" + (panel.size === sz ? " toggle-on" : "")
                        }
                        onClick={() =>
                          updatePanel(pageIdx, panelIdx, { size: sz })
                        }
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="field flex-2">
                  <span className="field-label">SFX</span>
                  <input
                    className="input"
                    placeholder="e.g. DON!!"
                    value={panel.sfx ?? ""}
                    onChange={(e) =>
                      updatePanel(pageIdx, panelIdx, {
                        sfx: e.target.value || undefined,
                      })
                    }
                  />
                </label>
              </div>

              <div className="dialogue-block">
                <div className="section-head">
                  <span className="field-label">Dialogue</span>
                  <button
                    className="btn btn-sm"
                    onClick={() => addDialogue(pageIdx, panelIdx)}
                  >
                    + Add line
                  </button>
                </div>
                {panel.dialogue.map((line, lineIdx) => (
                  <div className="dialogue-row" key={lineIdx}>
                    <input
                      className="input dlg-speaker"
                      placeholder="Speaker"
                      value={line.speaker}
                      onChange={(e) =>
                        updateDialogue(pageIdx, panelIdx, lineIdx, {
                          speaker: e.target.value,
                        })
                      }
                    />
                    <select
                      className="input dlg-kind"
                      value={line.kind}
                      onChange={(e) =>
                        updateDialogue(pageIdx, panelIdx, lineIdx, {
                          kind: e.target.value as DialogueLine["kind"],
                        })
                      }
                    >
                      {KINDS.map((k) => (
                        <option key={k} value={k}>
                          {k}
                        </option>
                      ))}
                    </select>
                    <input
                      className="input dlg-text"
                      placeholder="Text"
                      value={line.text}
                      onChange={(e) =>
                        updateDialogue(pageIdx, panelIdx, lineIdx, {
                          text: e.target.value,
                        })
                      }
                    />
                    <button
                      className="btn btn-icon"
                      title="Remove line"
                      onClick={() => removeDialogue(pageIdx, panelIdx, lineIdx)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
