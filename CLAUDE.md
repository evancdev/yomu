# Yomu — Manga Generator

Talk an idea → get a manga. Yomu turns a one-line premise into an editable manga
script, then renders each panel as art. Story-writing and art-generation are both
behind **swappable provider interfaces**, so either can be changed via env vars.

> `yomu` (読む) = "to read" in Japanese.

## Product flow (guided, 3 steps)

1. **Idea** — user types a premise and picks a style flag (B&W or color).
2. **Script** — server drafts a structured manga script (pages → panels → dialogue/sfx/shot).
   User reviews and **edits/approves** it. This is the "guided" step — art is not
   generated until the user approves.
3. **Render** — server generates panel art via the image provider; client lays it
   out as manga pages with balloons/sfx and offers export.

## Architecture

Single npm package, TypeScript throughout.

```
yomu/
  shared/types.ts            # API contract + domain types (imported by client AND server)
  server/
    config.ts                # env-driven config (providers, keys, ports)
    index.ts                 # Express app: serves API + built client
    routes/
      script.ts              # POST /api/script  -> ScriptResponse
      render.ts              # POST /api/render  -> RenderResponse
    providers/
      types.ts               # LLMProvider + ImageProvider interfaces
      registry.ts            # factories: pick provider by env var
      llm/
        prompt.ts            # system/user prompts for the script writer
        schema.ts            # tolerant zod parse + normalize of LLM JSON
        mock.ts              # deterministic script, no API key needed (DEFAULT)
        anthropic.ts         # Claude API implementation
      image/
        mock.ts              # SVG placeholder panels, no API needed (DEFAULT)
        magnific.ts          # Magnific REST adapter (needs premium key + URL)
  client/                    # Vite + React + TS frontend (built by a separate agent)
    index.html
    src/...
  vite.config.ts             # dev proxy /api -> server; build to dist/
```

### Provider model (the core design)

Two interfaces in `server/providers/types.ts`:

- **`LLMProvider.generateScript({ idea, style, pages }) => MangaScript`**
- **`ImageProvider.renderPanel({ panel, characters, style }) => RenderedPanel`**

Selected at runtime in `server/providers/registry.ts` from env vars:

| Env | Values | Default | Notes |
|-----|--------|---------|-------|
| `LLM_PROVIDER`   | `mock` \| `anthropic` | `mock` | `anthropic` needs `ANTHROPIC_API_KEY` |
| `IMAGE_PROVIDER` | `mock` \| `magnific`  | `mock` | `magnific` needs `MAGNIFIC_API_KEY` + premium |

**Defaults are mock**, so the app runs end-to-end with no keys. To add a new
provider: implement the interface, register it in `registry.ts`, document the env.

### API contract (`shared/types.ts` is source of truth)

- `GET  /api/config`  → `ConfigResponse` `{ llmProvider, imageProvider, live }`
- `POST /api/script`  ← `ScriptRequest` `{ idea, style, pages? }` → `ScriptResponse` `{ script }`
- `POST /api/render`  ← `RenderRequest` `{ script }` → `RenderResponse` `{ panels: RenderedPanel[] }`

Errors: non-2xx with `{ error: string }`.

Key domain types: `MangaStyle = "bw" | "color"`, `MangaScript` (title, logline,
style, `characters[]`, `pages[]`), `Panel` (id, description, shot, size 1-3,
`dialogue[]`, sfx?), `RenderedPanel` (panelId, imageUrl, provider, error?).

## Running

```bash
npm install
cp .env.example .env      # defaults to mock providers — works immediately
npm run dev               # server (tsx watch) + client (vite) via concurrently
```

- Server: http://localhost:8787
- Client dev: http://localhost:5173 (proxies `/api` → 8787)
- `npm run build` → client to `dist/`; `npm start` serves it from Express in prod.
- `npm run typecheck` → `tsc --noEmit`.

## Going live

1. **Story (Claude):** set `LLM_PROVIDER=anthropic`, `ANTHROPIC_API_KEY=...`,
   `LLM_MODEL=claude-sonnet-4-6` (or `claude-opus-4-8`).
2. **Art (Magnific):** set `IMAGE_PROVIDER=magnific`, `MAGNIFIC_API_KEY=...`,
   `MAGNIFIC_API_URL=...`. Magnific requires a **premium account**. NOTE: the
   Magnific access used during this build was an MCP/OAuth session bound to the
   Claude Code client — it is NOT reusable by a deployed server. The `magnific.ts`
   adapter targets a REST endpoint that must be confirmed/filled against the real
   Magnific API once premium is active. Until then `mock` is the working default.

## Conventions

- Keep `shared/types.ts` the single source of truth for anything crossing the
  client/server boundary. Don't duplicate these shapes.
- Providers must never throw raw — `renderPanel` returns a `RenderedPanel` with an
  `error` + placeholder image on failure so one bad panel can't kill a render.
- The LLM script step must be cheap to re-run; the render step is the expensive one.
- Style flag (`bw`/`color`) is threaded into BOTH prompts and image prompts.
