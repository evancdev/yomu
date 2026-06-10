import { useEffect, useState } from "react";
import type {
  ConfigResponse,
  MangaScript,
  RenderedPanel,
  ScriptRequest,
} from "@shared/types";
import { ApiRequestError, draftScript, getConfig, renderManga } from "./api";
import IdeaForm from "./components/IdeaForm";
import ScriptEditor from "./components/ScriptEditor";
import MangaView from "./components/MangaView";

type Step = "idea" | "script" | "manga";

const STEPS: { id: Step; label: string }[] = [
  { id: "idea", label: "Idea" },
  { id: "script", label: "Script" },
  { id: "manga", label: "Manga" },
];

export default function App() {
  const [step, setStep] = useState<Step>("idea");
  const [config, setConfig] = useState<ConfigResponse | null>(null);

  const [script, setScript] = useState<MangaScript | null>(null);
  const [panels, setPanels] = useState<RenderedPanel[] | null>(null);

  const [drafting, setDrafting] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getConfig()
      .then(setConfig)
      .catch(() => {
        /* config is non-essential; ignore failures */
      });
  }, []);

  async function handleDraft(req: ScriptRequest) {
    setError(null);
    setDrafting(true);
    try {
      const { script: drafted } = await draftScript(req);
      setScript(drafted);
      setStep("script");
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Failed to draft script.");
    } finally {
      setDrafting(false);
    }
  }

  async function handleRender(edited: MangaScript) {
    setError(null);
    setScript(edited);
    setRendering(true);
    try {
      const { panels: rendered } = await renderManga({ script: edited });
      setPanels(rendered);
      setStep("manga");
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Failed to render manga.");
    } finally {
      setRendering(false);
    }
  }

  function handleStartOver() {
    setScript(null);
    setPanels(null);
    setError(null);
    setStep("idea");
  }

  const activeIndex = STEPS.findIndex((s) => s.id === step);

  return (
    <div className="app">
      {config && !config.live && (
        <div className="banner" role="status">
          <strong>Preview mode</strong> — using mock providers (no API keys set).
        </div>
      )}

      <header className="app-header no-print">
        <div className="brand">
          <span className="brand-mark">読</span>
          <div>
            <h1>Yomu</h1>
            <p>Talk an idea, get a manga.</p>
          </div>
        </div>
        <ol className="steps">
          {STEPS.map((s, i) => (
            <li
              key={s.id}
              className={
                "step" +
                (i === activeIndex ? " step-active" : "") +
                (i < activeIndex ? " step-done" : "")
              }
            >
              <span className="step-num">{i + 1}</span>
              <span className="step-label">{s.label}</span>
            </li>
          ))}
        </ol>
      </header>

      {error && (
        <div className="error no-print" role="alert">
          {error}
        </div>
      )}

      <main className="app-main">
        {step === "idea" && <IdeaForm onSubmit={handleDraft} loading={drafting} />}

        {step === "script" && script && (
          <ScriptEditor
            initialScript={script}
            rendering={rendering}
            onBack={handleStartOver}
            onRender={handleRender}
          />
        )}

        {step === "manga" && script && panels && (
          <MangaView script={script} panels={panels} onStartOver={handleStartOver} />
        )}
      </main>
    </div>
  );
}
