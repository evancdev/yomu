import { useState } from "react";
import type { MangaStyle, ScriptRequest } from "@shared/types";

interface Props {
  onSubmit: (req: ScriptRequest) => void;
  loading: boolean;
}

const PAGE_OPTIONS = [1, 2, 3, 4, 5, 6];

export default function IdeaForm({ onSubmit, loading }: Props) {
  const [idea, setIdea] = useState("");
  const [style, setStyle] = useState<MangaStyle>("bw");
  const [pages, setPages] = useState(3);

  const canSubmit = idea.trim().length > 0 && !loading;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({ idea: idea.trim(), style, pages });
  }

  return (
    <form className="card idea-form" onSubmit={submit}>
      <h2>What's your story?</h2>
      <p className="muted">
        Describe a premise in a sentence or two. Yomu will draft an editable manga
        script you can shape before any art is drawn.
      </p>

      <label className="field">
        <span className="field-label">Story idea</span>
        <textarea
          className="textarea"
          rows={5}
          placeholder="e.g. A retired ramen chef discovers her noodles can briefly stop time, and a hungry city won't leave her alone."
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          autoFocus
        />
      </label>

      <div className="field-row">
        <div className="field">
          <span className="field-label">Style</span>
          <div className="toggle" role="group" aria-label="Style">
            <button
              type="button"
              className={"toggle-btn" + (style === "bw" ? " toggle-on" : "")}
              onClick={() => setStyle("bw")}
              aria-pressed={style === "bw"}
            >
              B&amp;W
            </button>
            <button
              type="button"
              className={"toggle-btn" + (style === "color" ? " toggle-on" : "")}
              onClick={() => setStyle("color")}
              aria-pressed={style === "color"}
            >
              Color
            </button>
          </div>
        </div>

        <div className="field">
          <span className="field-label">Pages</span>
          <div className="pages" role="group" aria-label="Number of pages">
            {PAGE_OPTIONS.map((n) => (
              <button
                type="button"
                key={n}
                className={"page-btn" + (pages === n ? " page-on" : "")}
                onClick={() => setPages(n)}
                aria-pressed={pages === n}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button type="submit" className="btn btn-primary btn-lg" disabled={!canSubmit}>
        {loading ? "Drafting script…" : "Draft script"}
      </button>
    </form>
  );
}
